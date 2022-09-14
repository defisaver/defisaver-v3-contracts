// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "ds-test/test.sol";

import "../TokenAddresses.sol";
import "../CheatCodes.sol";

import "../utils/Tokens.sol";
import "../utils/CompUser.sol";
import "../utils/StrategyBuilder.sol";
import "../utils/BundleBuilder.sol";
import "../utils/RegistryUtils.sol";
import "../utils/ActionsUtils.sol";
import "../utils/Strategies.sol";

import "../../contracts/views/CompV3View.sol";
import "../../contracts/core/strategy/StrategyModel.sol";
import "../../contracts/core/strategy/StrategyExecutor.sol";
import "../../contracts/triggers/CompV3RatioTrigger.sol";
import "../../contracts/actions/fee/GasFeeTaker.sol";
import "../../contracts/actions/exchange/DFSSell.sol";
import "../../contracts/actions/compoundV3/CompV3SubProxy.sol";
import "../../contracts/actions/checkers/CompV3RatioCheck.sol";

contract TestCompV3Automation is
    DSTest,
    DSMath,
    Tokens,
    TokenAddresses,
    RegistryUtils,
    ActionsUtils,
    Strategies
{
    CompUser user1;
    CompV3SubProxy subProxy;
    StrategyExecutor executor;
    CompV3View compV3View;
    CompV3RatioTrigger trigger;
    FLBalancer flBalancer;
    CompV3SubProxy.CompV3SubData params;

    StrategyModel.StrategySub repaySub;
    StrategyModel.StrategySub boostSub;
    uint repaySubId;
    uint boostSubId;

    address proxy;

    uint boostGasCost = 950_000;
    uint repayGasCost = 950_000;

    uint boostFLGasCost = 1_350_000;
    uint repayFLGasCost = 1_350_000;

    constructor() {
        trigger = new CompV3RatioTrigger();
        flBalancer = new FLBalancer();
        redeploy("CompV3Supply", address(new CompV3Supply()));
        redeploy("CompV3Withdraw", address(new CompV3Withdraw()));
        redeploy("CompV3Borrow", address(new CompV3Borrow()));
        redeploy("CompV3Payback", address(new CompV3Payback()));
        redeploy("CompV3RatioTrigger", address(trigger));
        redeploy("DFSSell", address(new DFSSell()));
        redeploy("GasFeeTaker", address(new GasFeeTaker()));
        redeploy("CompV3RatioCheck", address(new CompV3RatioCheck()));
        redeploy("FLBalancer", address(flBalancer));
        compV3View = new CompV3View();

        vm.etch(SUB_STORAGE_ADDR, address(new SubStorage()).code);

        executor = StrategyExecutor(getAddr("StrategyExecutorID"));

        addBotCaller(address(this));

        uint256 repayId = createCompV3Repay();
        uint256 repayFLId = createCompV3FLRepay();

        uint256 boostId = createCompV3Boost();
        uint256 boostFLId = createCompV3FLBoost();

        uint64[] memory repayIds = new uint64[](2);
        repayIds[0] = uint64(repayId);
        repayIds[1] = uint64(repayFLId);
        new BundleBuilder().init(repayIds);

        uint64[] memory boostIds = new uint64[](2);
        boostIds[0] = uint64(boostId);
        boostIds[1] = uint64(boostFLId);
        new BundleBuilder().init(boostIds);

        // create compV3 position
        user1 = new CompUser();
        gibTokens(user1.proxyAddr(), WETH_ADDR, 1000 ether);

        user1.supply(COMET_USDC, WETH_ADDR, 10 ether);
        user1.borrow(COMET_USDC, 10_000e6);

        proxy = user1.proxyAddr();

        subProxy = new CompV3SubProxy();

        uint128 minRatio = 180e16;
        uint128 maxRatio = 220e16;
        uint128 targetRatioBoost = 200e16;
        uint128 targetRatioRepay = 200e16;

        params = user1.subToAutomationBundles(address(subProxy), minRatio, maxRatio, targetRatioBoost, targetRatioRepay);

        repaySubId = SubStorage(SUB_STORAGE_ADDR).getSubsCount() - 2;
        boostSubId = SubStorage(SUB_STORAGE_ADDR).getSubsCount() - 1;

        repaySub = subProxy.formatRepaySub(params, proxy);
        boostSub = subProxy.formatBoostSub(params, proxy);
    }

    function testCompV3RepayStrategy() public {
        uint256 wethAmount = 0.5 ether;
        uint256 repayIndex = 0;

        bytes[] memory _triggerCallData = new bytes[](1);

        bytes[] memory _actionsCallData = new bytes[](5);
        _actionsCallData[0] = compV3WithdrawEncode(COMET_USDC, proxy, WETH_ADDR, wethAmount);
        _actionsCallData[1] = sellEncode(WETH_ADDR, USDC_ADDR, 0, proxy, proxy, UNI_V2_WRAPPER);
        _actionsCallData[2] = gasFeeEncode(repayGasCost, USDC_ADDR);
        _actionsCallData[3] = compV3PaybackEncode(COMET_USDC, proxy, 0);
        _actionsCallData[4] = compV3RatioCheckEncode(0, 0, address(0));

        uint beforeRatio = trigger.getSafetyRatio(COMET_USDC, proxy);

        uint startGas = gasleft();
        executor.executeStrategy(repaySubId, repayIndex, _triggerCallData, _actionsCallData, repaySub);
        console.log(startGas - gasleft());

        uint afterRatio = trigger.getSafetyRatio(COMET_USDC, proxy);

        assertGt(afterRatio, beforeRatio);
    }

    function testCompV3FLRepayStrategy() public {
        uint256 wethAmount = 0.5 ether;
        uint256 repayIndex = 1;

        bytes[] memory _triggerCallData = new bytes[](1);

        bytes[] memory _actionsCallData = new bytes[](6);
        _actionsCallData[0] = flBalancerEncode(WETH_ADDR, wethAmount);
        _actionsCallData[1] = sellEncode(WETH_ADDR, USDC_ADDR, wethAmount, proxy, proxy, UNI_V2_WRAPPER);
        _actionsCallData[2] = gasFeeEncode(repayFLGasCost, USDC_ADDR);
        _actionsCallData[3] = compV3PaybackEncode(COMET_USDC, proxy, 0);
        _actionsCallData[4] = compV3WithdrawEncode(COMET_USDC, address(flBalancer), WETH_ADDR, wethAmount);
        _actionsCallData[5] = compV3RatioCheckEncode(0, 0, address(0));

        uint beforeRatio = trigger.getSafetyRatio(COMET_USDC, proxy);

        executor.executeStrategy(repaySubId, repayIndex, _triggerCallData, _actionsCallData, repaySub);

        uint afterRatio = trigger.getSafetyRatio(COMET_USDC, proxy);

        assertGt(afterRatio, beforeRatio);
    }

    function testCompV3BoostStrategy() public {
        uint256 usdcAmount = 500e6;
        uint256 boostIndex = 0;

        user1.supply(COMET_USDC, WETH_ADDR, 10 ether);

        bytes[] memory _triggerCallData = new bytes[](1);

        bytes[] memory _actionsCallData = new bytes[](5);
        _actionsCallData[0] = compV3BorrowEncode(COMET_USDC, usdcAmount, proxy);
        _actionsCallData[1] = sellEncode(USDC_ADDR, WETH_ADDR, 0, proxy, proxy, UNI_V2_WRAPPER);
        _actionsCallData[2] = gasFeeEncode(boostGasCost, WETH_ADDR);
        _actionsCallData[3] = compV3SupplyEncode(COMET_USDC, WETH_ADDR, 0, proxy);
        _actionsCallData[4] = compV3RatioCheckEncode(0, 0, address(0));

        uint beforeRatio = trigger.getSafetyRatio(COMET_USDC, proxy);

        executor.executeStrategy(boostSubId, boostIndex, _triggerCallData, _actionsCallData, boostSub);
        uint afterRatio = trigger.getSafetyRatio(COMET_USDC, proxy);

        assertGt(beforeRatio, afterRatio);
    }

    function testCompV3BoostFLStrategy() public {
        uint256 usdcAmount = 500e6;
        uint256 boostIndex = 1;

        user1.supply(COMET_USDC, WETH_ADDR, 10 ether);

        bytes[] memory _triggerCallData = new bytes[](1);

        bytes[] memory _actionsCallData = new bytes[](6);
        _actionsCallData[0] = flBalancerEncode(USDC_ADDR, usdcAmount);
        _actionsCallData[1] = sellEncode(USDC_ADDR, WETH_ADDR, usdcAmount, proxy, proxy, UNI_V2_WRAPPER);
        _actionsCallData[2] = gasFeeEncode(boostFLGasCost, WETH_ADDR);
        _actionsCallData[3] = compV3SupplyEncode(COMET_USDC, WETH_ADDR, 0, proxy);
        _actionsCallData[4] = compV3BorrowEncode(COMET_USDC, usdcAmount, address(flBalancer));
        _actionsCallData[5] = compV3RatioCheckEncode(0, 0, address(0));

        uint beforeRatio = trigger.getSafetyRatio(COMET_USDC, proxy);

        executor.executeStrategy(boostSubId, boostIndex, _triggerCallData, _actionsCallData, boostSub);

        uint afterRatio = trigger.getSafetyRatio(COMET_USDC, proxy);

        assertGt(beforeRatio, afterRatio);
    }
}
