// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { IComet } from "../../../contracts/interfaces/compoundV3/IComet.sol";
import { IERC20 } from "../../../contracts/interfaces/IERC20.sol";
import { StrategyModel  } from "../../../contracts/core/strategy/StrategyModel.sol";
import { StrategyExecutor  } from "../../../contracts/core/strategy/StrategyExecutor.sol";
import { RecipeExecutor  } from "../../../contracts/core/RecipeExecutor.sol";
import { SafeModuleAuth  } from "../../../contracts/core/strategy/SafeModuleAuth.sol";
import { CompV3RatioTrigger  } from "../../../contracts/triggers/CompV3RatioTrigger.sol";
import { GasFeeTaker  } from "../../../contracts/actions/fee/GasFeeTaker.sol";
import { DFSSell  } from "../../../contracts/actions/exchange/DFSSell.sol";
import { CompV3SubProxy  } from "../../../contracts/actions/compoundV3/CompV3SubProxy.sol";
import { CompV3RatioCheck  } from "../../../contracts/actions/checkers/CompV3RatioCheck.sol";
import { FLAction  } from "../../../contracts/actions/flashloan/FLAction.sol";
import { SubStorage } from "../../../contracts/core/strategy/SubStorage.sol";
import { CompV3Supply } from "../../../contracts/actions/compoundV3/CompV3Supply.sol";
import { CompV3Withdraw } from "../../../contracts/actions/compoundV3/CompV3Withdraw.sol";
import { CompV3Borrow } from "../../../contracts/actions/compoundV3/CompV3Borrow.sol";
import { CompV3Payback } from "../../../contracts/actions/compoundV3/CompV3Payback.sol";
import { WrapperExchangeRegistry } from "../../../contracts/exchangeV3/registries/WrapperExchangeRegistry.sol";
import { CompUserEOA }from "../../utils/compV3/CompUserEOA.sol";
import { BundleBuilder } from "../../utils/BundleBuilder.sol";
import { RegistryUtils } from "../../utils/RegistryUtils.sol";
import { ActionsUtils } from "../../utils/ActionsUtils.sol";
import { Strategies } from "../../utils/Strategies.sol";
import { Addresses } from "../../utils/Addresses.sol";
import { BaseTest } from '../../utils/BaseTest.sol';

contract TestCompV3EOAAutomation is BaseTest, RegistryUtils, ActionsUtils {

    /*//////////////////////////////////////////////////////////////////////////
                                     VARIABLES
    //////////////////////////////////////////////////////////////////////////*/   
    CompUserEOA user1;
    address wallet;

    StrategyExecutor executor;
    CompV3RatioTrigger trigger;
    FLAction flAction;

    StrategyModel.StrategySub repaySub;
    uint256 repaySubId;
    uint64 repayBundleEoaId;

    StrategyModel.StrategySub boostSub;
    uint boostSubId;
    uint64 boostBundleEoaId;

    uint boostGasCost = 950_000;
    uint repayGasCost = 950_000;

    uint boostFLGasCost = 1_350_000;
    uint repayFLGasCost = 1_350_000;

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkMainnetLatest();

        trigger = new CompV3RatioTrigger();
        flAction = new FLAction();
        user1 = new CompUserEOA(Addresses.COMET_USDC);
        executor = new StrategyExecutor();

        _redeployContracts();
        _setUpExchangeWrapper();

        vm.etch(SUB_STORAGE_ADDR, address(new SubStorage()).code);
        vm.etch(Addresses.LEGACY_RECIPE_EXECUTOR_ADDR_V3, address(new RecipeExecutor()).code);

        addBotCaller(address(this));
        
        _initRepayBundle();
        _initBoostBundle();
    }

    function _redeployContracts() internal {
        redeploy("StrategyExecutorID", address(executor));
        redeploy("CompV3Supply", address(new CompV3Supply()));
        redeploy("CompV3Withdraw", address(new CompV3Withdraw()));
        redeploy("CompV3Borrow", address(new CompV3Borrow()));
        redeploy("CompV3Payback", address(new CompV3Payback()));
        redeploy("CompV3RatioTrigger", address(trigger));
        redeploy("DFSSell", address(new DFSSell()));
        redeploy("GasFeeTaker", address(new GasFeeTaker()));
        redeploy("CompV3RatioCheck", address(new CompV3RatioCheck()));
        redeploy("FLAction", address(flAction));
        redeploy("RecipeExecutor", address(new RecipeExecutor()));
        redeploy("SafeModuleAuth", address(new SafeModuleAuth()));
    }

    function _setUpExchangeWrapper() internal {
        WrapperExchangeRegistry exchangeRegistry = WrapperExchangeRegistry(Addresses.WRAPPER_EXCHANGE_REGISTRY);
        vm.startPrank(Addresses.OWNER_ACC);
        exchangeRegistry.addWrapper(Addresses.UNI_V2_WRAPPER);
        vm.stopPrank();
    }

    function _initRepayBundle() internal {
        uint256 repayId = Strategies.createCompV3EOARepay();
        uint256 repayFLId = Strategies.createCompV3FLEOARepay();

        BundleBuilder bundleBuilder = new BundleBuilder();

        uint64[] memory repayIds = new uint64[](2);
        repayIds[0] = uint64(repayId);
        repayIds[1] = uint64(repayFLId);
        repayBundleEoaId = uint64(bundleBuilder.init(repayIds));
    }

    function _initBoostBundle() internal {
        uint256 boostId = Strategies.createCompV3EOABoost();
        uint256 boostFLId = Strategies.createCompV3FLEOABoost();

        BundleBuilder bundleBuilder = new BundleBuilder();

        uint64[] memory boostIds = new uint64[](2);
        boostIds[0] = uint64(boostId);
        boostIds[1] = uint64(boostFLId);
        boostBundleEoaId = uint64(bundleBuilder.init(boostIds));
    }

    function _createCompPosition() internal {
        gibTokens(address(user1), Addresses.WETH_ADDR, 1000 ether);
        uint ethAmount = amountInUSDPrice(Addresses.WETH_ADDR, 15_000);
        user1.supply(Addresses.WETH_ADDR, ethAmount);
        user1.borrow(10_000e6);
    }

    function _subToAutomationBundles(bool _isSafe) internal {
        CompV3SubProxy subProxy = new CompV3SubProxy(0, 0, repayBundleEoaId, boostBundleEoaId);

        uint128 minRatio = 180e16;
        uint128 maxRatio = 220e16;
        uint128 targetRatioBoost = 200e16;
        uint128 targetRatioRepay = 200e16;
        bool isEOA = true;

        CompV3SubProxy.CompV3SubData memory params = user1.subToAutomationBundles(
            _isSafe,
            address(subProxy),
            minRatio,
            maxRatio,
            targetRatioBoost,
            targetRatioRepay,
            isEOA
        );

        repaySubId = SubStorage(SUB_STORAGE_ADDR).getSubsCount() - 2;
        boostSubId = SubStorage(SUB_STORAGE_ADDR).getSubsCount() - 1;

        repaySub = subProxy.formatRepaySub(params, wallet, address(user1));
        boostSub = subProxy.formatBoostSub(params, wallet, address(user1));
    }

    function _walletSetUpBeforeEachTest(bool _isSafe) internal {
        wallet = _isSafe ? user1.safeAddr() : user1.proxyAddr();
        _createCompPosition();
        _subToAutomationBundles(_isSafe);
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function testCompV3EOARepayStrategy() public {
        _testCompV3EOARepayStrategy(false);
        _testCompV3EOARepayStrategy(true);
    }

    function testCompV3EOAFLRepayStrategy() public {
        _testCompV3EOAFLRepayStrategy(false);
        _testCompV3EOAFLRepayStrategy(true);
    }

    function testCompV3EOABoostStrategy() public {
        _testCompV3EOABoostStrategy(false);
        _testCompV3EOABoostStrategy(true);
    }

    function testCompV3EOABoostFLStrategy() public {
        _testCompV3EOABoostFLStrategy(false);
        _testCompV3EOABoostFLStrategy(true);
    }

    function _testCompV3EOARepayStrategy(bool _isSafe) internal {
        _walletSetUpBeforeEachTest(_isSafe);

        uint wethAmount = amountInUSDPrice(Addresses.WETH_ADDR, 1_000);
        uint256 repayIndex = 0;

        uint256 borrowAmountBefore = IComet(Addresses.COMET_USDC).borrowBalanceOf(address(user1));
        uint256 txFeeBalanceBefore = IERC20(Addresses.WETH_ADDR).balanceOf(Addresses.FEE_RECEIVER);

        bytes[] memory _triggerCallData = new bytes[](1);

        bytes[] memory _actionsCallData = new bytes[](5);
        _actionsCallData[0] = compV3WithdrawEncode(Addresses.COMET_USDC, wallet, Addresses.WETH_ADDR, wethAmount);
        _actionsCallData[1] = sellEncode(Addresses.WETH_ADDR, Addresses.USDC_ADDR, 0, wallet, wallet, Addresses.UNI_V2_WRAPPER);
        _actionsCallData[2] = gasFeeEncode(repayGasCost, Addresses.USDC_ADDR);
        _actionsCallData[3] = compV3PaybackEncode(Addresses.COMET_USDC, wallet, 0);
        _actionsCallData[4] = compV3RatioCheckEncode(0, 0, address(0));

        uint beforeRatio = trigger.getSafetyRatio(Addresses.COMET_USDC, address(user1));

        executor.executeStrategy(repaySubId, repayIndex, _triggerCallData, _actionsCallData, repaySub);

        uint afterRatio = trigger.getSafetyRatio(Addresses.COMET_USDC, address(user1));
        uint256 txFeeBalanceAfter = IERC20(Addresses.WETH_ADDR).balanceOf(Addresses.FEE_RECEIVER);
        uint256 borrowAmountAfter = IComet(Addresses.COMET_USDC).borrowBalanceOf(address(user1));

        uint amountAfterFee = wethAmount - (wethAmount / 400);

        // assert exchange fee
        assertEq(wethAmount - amountAfterFee, txFeeBalanceAfter - txFeeBalanceBefore);
        assertGt(borrowAmountBefore, borrowAmountAfter);
        assertGt(afterRatio, beforeRatio);
    }

    function _testCompV3EOAFLRepayStrategy(bool _isSafe) internal {
        _walletSetUpBeforeEachTest(_isSafe);

        uint wethAmount = amountInUSDPrice(Addresses.WETH_ADDR, 1_000);

        uint256 repayIndex = 1;

        bytes[] memory _triggerCallData = new bytes[](1);

        bytes[] memory _actionsCallData = new bytes[](6);
        _actionsCallData[0] = flActionEncode(Addresses.WETH_ADDR, wethAmount, FLSource.BALANCER);
        _actionsCallData[1] = sellEncode(Addresses.WETH_ADDR, Addresses.USDC_ADDR, wethAmount, wallet, wallet, Addresses.UNI_V2_WRAPPER);
        _actionsCallData[2] = gasFeeEncode(repayFLGasCost, Addresses.USDC_ADDR);
        _actionsCallData[3] = compV3PaybackEncode(Addresses.COMET_USDC, wallet, 0);
        _actionsCallData[4] = compV3WithdrawEncode(Addresses.COMET_USDC, address(flAction), Addresses.WETH_ADDR, wethAmount);
        _actionsCallData[5] = compV3RatioCheckEncode(0, 0, address(0));

        uint beforeRatio = trigger.getSafetyRatio(Addresses.COMET_USDC, address(user1));

        executor.executeStrategy(repaySubId, repayIndex, _triggerCallData, _actionsCallData, repaySub);

        uint afterRatio = trigger.getSafetyRatio(Addresses.COMET_USDC, address(user1));

        assertGt(afterRatio, beforeRatio);
    }

    function _testCompV3EOABoostStrategy(bool _isSafe) internal {
        _walletSetUpBeforeEachTest(_isSafe);

        uint256 usdcAmount = 500e6;
        uint256 boostIndex = 0;

        uint ethAmount = amountInUSDPrice(Addresses.WETH_ADDR, 15_000);
        user1.supply(Addresses.WETH_ADDR, ethAmount);

        bytes[] memory _triggerCallData = new bytes[](1);

        bytes[] memory _actionsCallData = new bytes[](5);
        _actionsCallData[0] = compV3BorrowEncode(Addresses.COMET_USDC, usdcAmount, wallet);
        _actionsCallData[1] = sellEncode(Addresses.USDC_ADDR, Addresses.WETH_ADDR, 0, wallet, wallet, Addresses.UNI_V2_WRAPPER);
        _actionsCallData[2] = gasFeeEncode(boostGasCost, Addresses.WETH_ADDR);
        _actionsCallData[3] = compV3SupplyEncode(Addresses.COMET_USDC, Addresses.WETH_ADDR, 0, wallet);
        _actionsCallData[4] = compV3RatioCheckEncode(0, 0, address(0));

        uint beforeRatio = trigger.getSafetyRatio(Addresses.COMET_USDC, address(user1));

        executor.executeStrategy(boostSubId, boostIndex, _triggerCallData, _actionsCallData, boostSub);
        uint afterRatio = trigger.getSafetyRatio(Addresses.COMET_USDC, address(user1));

        assertGt(beforeRatio, afterRatio);
    }

    function _testCompV3EOABoostFLStrategy(bool _isSafe) internal {
        _walletSetUpBeforeEachTest(_isSafe);

        uint256 usdcAmount = 500e6;
        uint256 boostIndex = 1;

        uint ethAmount = amountInUSDPrice(Addresses.WETH_ADDR, 15_000);
        user1.supply(Addresses.WETH_ADDR, ethAmount);

        bytes[] memory _triggerCallData = new bytes[](1);

        bytes[] memory _actionsCallData = new bytes[](6);
        _actionsCallData[0] = flActionEncode(Addresses.USDC_ADDR, usdcAmount, FLSource.BALANCER);
        _actionsCallData[1] = sellEncode(Addresses.USDC_ADDR, Addresses.WETH_ADDR, usdcAmount, wallet, wallet, Addresses.UNI_V2_WRAPPER);
        _actionsCallData[2] = gasFeeEncode(boostFLGasCost, Addresses.WETH_ADDR);
        _actionsCallData[3] = compV3SupplyEncode(Addresses.COMET_USDC, Addresses.WETH_ADDR, 0, wallet);
        _actionsCallData[4] = compV3BorrowEncode(Addresses.COMET_USDC, usdcAmount, address(flAction));
        _actionsCallData[5] = compV3RatioCheckEncode(0, 0, address(0));

        uint beforeRatio = trigger.getSafetyRatio(Addresses.COMET_USDC, address(user1));

        executor.executeStrategy(boostSubId, boostIndex, _triggerCallData, _actionsCallData, boostSub);

        uint afterRatio = trigger.getSafetyRatio(Addresses.COMET_USDC, wallet);

        assertGt(beforeRatio, afterRatio);
    }
}
