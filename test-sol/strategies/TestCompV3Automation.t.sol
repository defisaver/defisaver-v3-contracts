// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "ds-test/test.sol";
import "../CheatCodes.sol";

import "../utils/Tokens.sol";
import "../utils/CompUser.sol";
import "../TokenAddresses.sol";

import "../utils/StrategyBuilder.sol";
import "../utils/BundleBuilder.sol";
import "../utils/RegistryUtils.sol";
import "../utils/ActionsUtils.sol";
import "../utils/Strategies.sol";

import "../../contracts/core/strategy/StrategyModel.sol";
import "../../contracts/core/strategy/StrategyExecutor.sol";
import "../../contracts/triggers/CompV3RatioTrigger.sol";
import "../../contracts/actions/fee/GasFeeTaker.sol";
import "../../contracts/actions/exchange/DFSSell.sol";
import "../../contracts/actions/compoundV3/CompV3SubProxy.sol";

contract TestCompV3Automation is
    DSTest,
    DSMath,
    Tokens,
    TokenAddresses,
    RegistryUtils,
    ActionsUtils,
    Strategies
{
    address internal constant COMET_USDC = 0xc3d688B66703497DAA19211EEdff47f25384cdc3;

    CompUser user1;
    CompV3SubProxy subProxy;

    constructor() {
        redeploy("CompV3Supply", address(new CompV3Supply()));
        redeploy("CompV3Withdraw", address(new CompV3Withdraw()));
        redeploy("CompV3Borrow", address(new CompV3Borrow()));
        redeploy("CompV3Payback", address(new CompV3Payback()));
        redeploy("CompV3RatioTrigger", address(new CompV3RatioTrigger()));
        redeploy("DFSSell", address(new DFSSell()));
        redeploy("GasFeeTaker", address(new GasFeeTaker()));

        addBotCaller(address(this));

        vm.etch(SUB_STORAGE_ADDR, address(new SubStorage()).code);

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
        gibTokens(user1.proxyAddr(), WETH_ADDR, 10 ether);

        user1.supply(COMET_USDC, WETH_ADDR, 10 ether);
        user1.borrow(COMET_USDC, 10_000e6);

        subProxy = new CompV3SubProxy();
    }

    function testCompV3RepayStrategy() public {
        uint128 minRatio = 180e16;
        uint128 maxRatio = 220e16;
        uint128 targetRatioBoost = 200e16;
        uint128 targetRatioRepay = 200e16;

        uint256 wethAmount = 0.5 ether;

        CompV3SubProxy.CompV3SubData memory params = CompV3SubProxy.CompV3SubData({
            market: COMET_USDC,
            baseToken: USDC_ADDR,
            minRatio: minRatio,
            maxRatio: maxRatio,
            targetRatioBoost: targetRatioBoost,
            targetRatioRepay: targetRatioRepay,
            boostEnabled: true
        });

        user1.executeWithProxy(
            address(subProxy),
            abi.encodeWithSignature(
                "subToCompV3Automation((address,address,uint128,uint128,uint128,uint128,bool))",
                params
            )
        );

        StrategyExecutor executor = StrategyExecutor(getAddr("StrategyExecutorID"));
        uint256 repayIndex = 0;

        bytes[] memory _triggerCallData = new bytes[](1);
        _triggerCallData[0] = "";
        bytes[] memory _actionsCallData = new bytes[](4);

        address proxy = user1.proxyAddr();

        address[] memory path = new address[](2);
        path[0] = WETH_ADDR;
        path[1] = USDC_ADDR;
        bytes memory wrapperData = abi.encode(path);

        _actionsCallData[0] = compV3WithdrawEncode(COMET_USDC, proxy, WETH_ADDR, wethAmount);
        _actionsCallData[1] = sellEncode(WETH_ADDR, USDC_ADDR, 0, proxy, proxy, UNI_V2_WRAPPER, wrapperData);
        _actionsCallData[2] = gasFeeEncode(1_200_000, USDC_ADDR);
        _actionsCallData[3] = compV3PaybackEncode(COMET_USDC, proxy, 0);

        StrategyModel.StrategySub memory sub = subProxy.formatRepaySub(params, proxy);

        uint256 subId = SubStorage(SUB_STORAGE_ADDR).getSubsCount() - 2;

        executor.executeStrategy(subId, repayIndex, _triggerCallData, _actionsCallData, sub);
    }
}
