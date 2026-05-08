// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { AaveV3Borrow } from "../../../contracts/actions/aaveV3/AaveV3Borrow.sol";
import { AaveV3Payback } from "../../../contracts/actions/aaveV3/AaveV3Payback.sol";
import { AaveV3SubProxy } from "../../../contracts/actions/aaveV3/AaveV3SubProxy.sol";
import { AaveV3Supply } from "../../../contracts/actions/aaveV3/AaveV3Supply.sol";
import { AaveV3Withdraw } from "../../../contracts/actions/aaveV3/AaveV3Withdraw.sol";
import { AaveV3RatioCheck } from "../../../contracts/actions/checkers/AaveV3RatioCheck.sol";
import { DFSSell } from "../../../contracts/actions/exchange/DFSSell.sol";
import { GasFeeTaker } from "../../../contracts/actions/fee/GasFeeTaker.sol";
import { FLAction } from "../../../contracts/actions/flashloan/FLAction.sol";
import { RecipeExecutor } from "../../../contracts/core/RecipeExecutor.sol";
import { SafeModuleAuth } from "../../../contracts/core/strategy/SafeModuleAuth.sol";
import { StrategyExecutor } from "../../../contracts/core/strategy/StrategyExecutor.sol";
import { StrategyModel } from "../../../contracts/core/strategy/StrategyModel.sol";
import { SubStorage } from "../../../contracts/core/strategy/SubStorage.sol";
import {
    WrapperExchangeRegistry
} from "../../../contracts/exchangeV3/registries/WrapperExchangeRegistry.sol";
import { IERC20 } from "../../../contracts/interfaces/token/IERC20.sol";
import { DataTypes } from "../../../contracts/interfaces/protocols/aaveV3/DataTypes.sol";
import {
    IPoolAddressesProvider
} from "../../../contracts/interfaces/protocols/aaveV3/IPoolAddressesProvider.sol";
import { IPoolV3 } from "../../../contracts/interfaces/protocols/aaveV3/IPoolV3.sol";
import { AaveV3RatioTrigger } from "../../../contracts/triggers/AaveV3RatioTrigger.sol";
import { Addresses } from "../../utils/helpers/MainnetAddresses.sol";
import { ActionsUtils } from "../../utils/ActionsUtils.sol";
import { BundleBuilder } from "../../utils/BundleBuilder.sol";
import { RegistryUtils } from "../../utils/RegistryUtils.sol";
import { Strategies } from "../../utils/Strategies.sol";
import { AaveV3User } from "../../utils/aaveV3/AaveV3User.sol";
import { BaseTest } from "../../utils/BaseTest.sol";
import { AaveV3Encode } from "../../utils/encode/AaveV3Encode.sol";
import { AaveV3TestHelper } from "../../utils/aaveV3/AaveV3TestHelper.sol";
import { console2 } from "forge-std/console2.sol";

contract TestAaveV3Automation is BaseTest, RegistryUtils, ActionsUtils, AaveV3TestHelper {
    /*//////////////////////////////////////////////////////////////////////////
                                     VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    address internal constant AAVE_MARKET = 0x2f39d218133AFaB8F2B819B1066c7E434Ad94E9e;

    uint256 internal REPAY_AMOUNT_WETH;
    uint256 internal INITIAL_COLLATERAL_WETH_AMOUNT;

    uint128 internal constant MIN_RATIO = 180e16;
    uint128 internal constant MAX_RATIO = 220e16;
    uint128 internal constant TARGET_RATIO_BOOST = 200e16;
    uint128 internal constant TARGET_RATIO_REPAY = 200e16;

    uint256 internal constant INITIAL_TOKEN_AMOUNT = 1000 ether;
    uint256 internal constant INITIAL_DEBT_DAI_AMOUNT = 10_000e18;

    uint256 internal constant INDEX_REPAY = 0;
    uint256 internal constant INDEX_REPAY_FL = 1;
    uint256 internal constant INDEX_BOOST = 0;
    uint256 internal constant INDEX_BOOST_FL = 1;

    uint256 internal constant BOOST_AMOUNT_DAI = 500e18;

    uint256 internal constant BOOST_GAS_COST = 950_000;
    uint256 internal constant REPAY_GAS_COST = 950_000;

    uint256 internal constant BOOST_FL_GAS_COST = 1_350_000;
    uint256 internal constant REPAY_FL_GAS_COST = 1_350_000;

    AaveV3User internal user;
    address internal wallet;

    IPoolAddressesProvider internal poolAddressesProvider;
    IPoolV3 internal pool;

    DataTypes.ReserveData internal collateralAsset;
    address internal collateralToken;
    DataTypes.ReserveData internal debtAsset;
    address internal debtToken;

    FLAction internal flAction;
    StrategyExecutor internal executor;
    AaveV3RatioTrigger internal trigger;

    StrategyModel.StrategySub internal repaySub;
    uint256 internal repaySubId;
    uint64 internal repayBundleId;

    StrategyModel.StrategySub internal boostSub;
    uint256 internal boostSubId;
    uint64 internal boostBundleId;

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkFromEnv("");

        REPAY_AMOUNT_WETH = amountInUSDPrice(Addresses.WETH_ADDR, 1000);
        INITIAL_COLLATERAL_WETH_AMOUNT = amountInUSDPrice(Addresses.WETH_ADDR, 15_000);

        poolAddressesProvider = IPoolAddressesProvider(AAVE_MARKET);
        pool = IPoolV3(poolAddressesProvider.getPool());

        collateralAsset = pool.getReserveData(Addresses.WETH_ADDR);
        debtAsset = pool.getReserveData(Addresses.DAI_ADDR);

        user = new AaveV3User();

        flAction = new FLAction();
        trigger = new AaveV3RatioTrigger();
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
        redeploy("AaveV3Supply", address(new AaveV3Supply()));
        redeploy("AaveV3Withdraw", address(new AaveV3Withdraw()));
        redeploy("AaveV3Borrow", address(new AaveV3Borrow()));
        redeploy("AaveV3Payback", address(new AaveV3Payback()));
        redeploy("AaveV3RatioTrigger", address(trigger));
        redeploy("DFSSell", address(new DFSSell()));
        redeploy("GasFeeTaker", address(new GasFeeTaker()));
        redeploy("AaveV3RatioCheck", address(new AaveV3RatioCheck()));
        redeploy("FLAction", address(flAction));
        redeploy("RecipeExecutor", address(new RecipeExecutor()));
        redeploy("SafeModuleAuth", address(new SafeModuleAuth()));
    }

    function _setUpExchangeWrapper() internal {
        WrapperExchangeRegistry exchangeRegistry =
            WrapperExchangeRegistry(Addresses.WRAPPER_EXCHANGE_REGISTRY);
        vm.startPrank(Addresses.OWNER_ACC);
        exchangeRegistry.addWrapper(Addresses.UNI_V2_WRAPPER);
        vm.stopPrank();
    }

    function _initRepayBundle() internal {
        uint256 repayId = Strategies.createAaveV3Repay();
        uint256 repayFLId = Strategies.createAaveV3FLRepay();

        BundleBuilder bundleBuilder = new BundleBuilder();

        uint64[] memory repayIds = new uint64[](2);
        repayIds[INDEX_REPAY] = uint64(repayId);
        repayIds[INDEX_REPAY_FL] = uint64(repayFLId);
        repayBundleId = uint64(bundleBuilder.init(repayIds));
    }

    function _initBoostBundle() internal {
        uint256 boostId = Strategies.createAaveV3Boost();
        uint256 boostFLId = Strategies.createAaveV3FLBoost();

        BundleBuilder bundleBuilder = new BundleBuilder();

        uint64[] memory boostIds = new uint64[](2);
        boostIds[INDEX_BOOST] = uint64(boostId);
        boostIds[INDEX_BOOST_FL] = uint64(boostFLId);
        boostBundleId = uint64(bundleBuilder.init(boostIds));
    }

    function _createAaveV3Position(bool _isSafe, address _wallet) internal returns (bool) {
        gibTokens(_wallet, Addresses.WETH_ADDR, INITIAL_TOKEN_AMOUNT);

        if (!isValidSupply(AAVE_MARKET, collateralToken, INITIAL_COLLATERAL_WETH_AMOUNT)) {
            console2.log(
                "[AaveV3Automation] Can't supply collateral asset (check cap and flags). Skipping test..."
            );
            return false;
        }

        if (!isValidBorrow(AAVE_MARKET, debtToken, INITIAL_DEBT_DAI_AMOUNT)) {
            console2.log(
                "[AaveV3Automation] Can't borrow debt asset (check cap and flags). Skipping test..."
            );
            return false;
        }

        user.supply(INITIAL_COLLATERAL_WETH_AMOUNT, _isSafe, collateralAsset.id, AAVE_MARKET);
        user.borrow(_isSafe, AAVE_MARKET, INITIAL_DEBT_DAI_AMOUNT, 2, debtAsset.id);

        return true;
    }

    function _subToAutomationBundles(bool _isSafe) internal {
        AaveV3SubProxy subProxy = new AaveV3SubProxy(repayBundleId, boostBundleId);

        AaveV3SubProxy.AaveSubData memory params = user.subToAutomationBundles(
            _isSafe, address(subProxy), MIN_RATIO, MAX_RATIO, TARGET_RATIO_BOOST, TARGET_RATIO_REPAY
        );

        repaySubId = SubStorage(SUB_STORAGE_ADDR).getSubsCount() - 2;
        boostSubId = SubStorage(SUB_STORAGE_ADDR).getSubsCount() - 1;

        repaySub = _formatRepaySub(params);
        boostSub = _formatBoostSub(params);
    }

    function _walletSetUpBeforeEachTest(bool _isSafe) internal returns (bool) {
        wallet = _isSafe ? user.safeAddr() : user.proxyAddr();
        if (!_createAaveV3Position(_isSafe, wallet)) return false;
        _subToAutomationBundles(_isSafe);
        return true;
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function testAaveV3RepayStrategy() public {
        _testAaveV3RepayStrategy(false);
        _testAaveV3RepayStrategy(true);
    }

    function testAaveV3FLRepayStrategy() public {
        _testAaveV3FLRepayStrategy(false);
        _testAaveV3FLRepayStrategy(true);
    }

    function testAaveV3BoostStrategy() public {
        _testAaveV3BoostStrategy(false);
        _testAaveV3BoostStrategy(true);
    }

    function testAaveV3BoostFLStrategy() public {
        _testAaveV3BoostFLStrategy(false);
        _testAaveV3BoostFLStrategy(true);
    }

    function _testAaveV3RepayStrategy(bool _isSafe) internal {
        if (!_walletSetUpBeforeEachTest(_isSafe)) return;

        uint256 beforeRatio = trigger.getSafetyRatio(AAVE_MARKET, wallet);

        uint256 borrowAmountBefore = IERC20(debtAsset.variableDebtTokenAddress).balanceOf(wallet);

        uint256 txFeeBalanceBefore = IERC20(Addresses.WETH_ADDR).balanceOf(Addresses.FEE_RECEIVER);

        bytes[] memory _triggerCallData = new bytes[](1);

        bytes[] memory _actionsCallData = new bytes[](5);
        _actionsCallData[0] =
            AaveV3Encode.withdraw(collateralAsset.id, true, REPAY_AMOUNT_WETH, wallet, address(0));
        _actionsCallData[1] = sellEncode(
            Addresses.WETH_ADDR, Addresses.DAI_ADDR, 0, wallet, wallet, Addresses.UNI_V2_WRAPPER
        );
        _actionsCallData[2] = gasFeeEncode(REPAY_GAS_COST, Addresses.DAI_ADDR);
        _actionsCallData[3] =
            AaveV3Encode.payback(0, wallet, 2, debtAsset.id, true, false, address(0), address(0));
        _actionsCallData[4] = AaveV3Encode.ratioCheck(0, 0, AAVE_MARKET, wallet);

        executor.executeStrategy(
            repaySubId, INDEX_REPAY, _triggerCallData, _actionsCallData, repaySub
        );

        uint256 afterRatio = trigger.getSafetyRatio(AAVE_MARKET, wallet);

        uint256 borrowAmountAfter = IERC20(debtAsset.variableDebtTokenAddress).balanceOf(wallet);

        uint256 txFeeBalanceAfter = IERC20(Addresses.WETH_ADDR).balanceOf(Addresses.FEE_RECEIVER);

        uint256 amountAfterFee = REPAY_AMOUNT_WETH - (REPAY_AMOUNT_WETH / 400);

        assertEq(REPAY_AMOUNT_WETH - amountAfterFee, txFeeBalanceAfter - txFeeBalanceBefore);
        assertGt(borrowAmountBefore, borrowAmountAfter);
        assertGt(afterRatio, beforeRatio);
    }

    function _testAaveV3FLRepayStrategy(bool _isSafe) internal {
        if (!_walletSetUpBeforeEachTest(_isSafe)) return;

        bytes[] memory _triggerCallData = new bytes[](1);

        bytes[] memory _actionsCallData = new bytes[](6);
        _actionsCallData[0] =
            flActionEncode(Addresses.WETH_ADDR, REPAY_AMOUNT_WETH, FLSource.BALANCER);
        _actionsCallData[1] = sellEncode(
            Addresses.WETH_ADDR,
            Addresses.DAI_ADDR,
            REPAY_AMOUNT_WETH,
            wallet,
            wallet,
            Addresses.UNI_V2_WRAPPER
        );
        _actionsCallData[2] = gasFeeEncode(REPAY_FL_GAS_COST, Addresses.DAI_ADDR);
        _actionsCallData[3] =
            AaveV3Encode.payback(0, wallet, 2, debtAsset.id, true, false, address(0), address(0));
        _actionsCallData[4] =
            AaveV3Encode.withdraw(collateralAsset.id, true, 0, address(flAction), address(0));
        _actionsCallData[5] = AaveV3Encode.ratioCheck(0, 0, AAVE_MARKET, wallet);

        uint256 beforeRatio = trigger.getSafetyRatio(AAVE_MARKET, wallet);

        executor.executeStrategy(
            repaySubId, INDEX_REPAY_FL, _triggerCallData, _actionsCallData, repaySub
        );

        uint256 afterRatio = trigger.getSafetyRatio(AAVE_MARKET, wallet);

        assertGt(afterRatio, beforeRatio);
    }

    function _testAaveV3BoostStrategy(bool _isSafe) internal {
        if (!_walletSetUpBeforeEachTest(_isSafe)) return;

        user.supply(INITIAL_COLLATERAL_WETH_AMOUNT, _isSafe, collateralAsset.id, AAVE_MARKET);

        bytes[] memory _triggerCallData = new bytes[](1);

        bytes[] memory _actionsCallData = new bytes[](5);
        _actionsCallData[0] = AaveV3Encode.borrow(
            BOOST_AMOUNT_DAI, address(0), 2, debtAsset.id, true, false, address(0), address(0)
        );
        _actionsCallData[1] = sellEncode(
            Addresses.DAI_ADDR, Addresses.WETH_ADDR, 0, wallet, wallet, Addresses.UNI_V2_WRAPPER
        );
        _actionsCallData[2] = gasFeeEncode(BOOST_GAS_COST, Addresses.WETH_ADDR);
        _actionsCallData[3] =
            AaveV3Encode.supply(0, wallet, collateralAsset.id, true, false, address(0), address(0));
        _actionsCallData[4] = AaveV3Encode.ratioCheck(0, 0, AAVE_MARKET, wallet);

        uint256 beforeRatio = trigger.getSafetyRatio(AAVE_MARKET, wallet);

        executor.executeStrategy(
            boostSubId, INDEX_BOOST, _triggerCallData, _actionsCallData, boostSub
        );
        uint256 afterRatio = trigger.getSafetyRatio(AAVE_MARKET, wallet);

        assertGt(beforeRatio, afterRatio);
    }

    function _testAaveV3BoostFLStrategy(bool _isSafe) internal {
        if (!_walletSetUpBeforeEachTest(_isSafe)) return;

        user.supply(INITIAL_COLLATERAL_WETH_AMOUNT, _isSafe, collateralAsset.id, AAVE_MARKET);

        bytes[] memory _triggerCallData = new bytes[](1);

        bytes[] memory _actionsCallData = new bytes[](6);
        _actionsCallData[0] =
            flActionEncode(Addresses.DAI_ADDR, BOOST_AMOUNT_DAI, FLSource.BALANCER);
        _actionsCallData[1] = sellEncode(
            Addresses.DAI_ADDR,
            Addresses.WETH_ADDR,
            BOOST_AMOUNT_DAI,
            wallet,
            wallet,
            Addresses.UNI_V2_WRAPPER
        );
        _actionsCallData[2] = gasFeeEncode(BOOST_FL_GAS_COST, Addresses.WETH_ADDR);
        _actionsCallData[3] =
            AaveV3Encode.supply(0, wallet, collateralAsset.id, true, false, address(0), address(0));
        _actionsCallData[4] = AaveV3Encode.borrow(
            0, address(flAction), 2, debtAsset.id, true, false, address(0), address(0)
        );
        _actionsCallData[5] = AaveV3Encode.ratioCheck(0, 0, AAVE_MARKET, wallet);

        uint256 beforeRatio = trigger.getSafetyRatio(AAVE_MARKET, wallet);

        executor.executeStrategy(
            boostSubId, INDEX_BOOST_FL, _triggerCallData, _actionsCallData, boostSub
        );

        uint256 afterRatio = trigger.getSafetyRatio(AAVE_MARKET, wallet);

        assertGt(beforeRatio, afterRatio);
    }

    /*//////////////////////////////////////////////////////////////////////////
                                       HELPERS
    //////////////////////////////////////////////////////////////////////////*/
    function _formatRepaySub(AaveV3SubProxy.AaveSubData memory _user)
        public
        view
        returns (StrategyModel.StrategySub memory sub)
    {
        sub.strategyOrBundleId = repayBundleId;
        sub.isBundle = true;

        bytes memory triggerData = abi.encode(
            wallet, AAVE_MARKET, uint256(_user.minRatio), uint8(AaveV3SubProxy.RatioState.UNDER)
        );
        sub.triggerData = new bytes[](1);
        sub.triggerData[0] = triggerData;

        sub.subData = new bytes32[](4);
        sub.subData[0] = bytes32(uint256(_user.targetRatioRepay)); // targetRatio
        sub.subData[1] = bytes32(uint256(1)); // ratioState = repay
        sub.subData[2] = bytes32(uint256(1)); // useDefaultMarket = true
        sub.subData[3] = bytes32(uint256(0)); // onBehalfOf = false
    }

    function _formatBoostSub(AaveV3SubProxy.AaveSubData memory _user)
        public
        view
        returns (StrategyModel.StrategySub memory sub)
    {
        sub.strategyOrBundleId = boostBundleId;
        sub.isBundle = true;

        bytes memory triggerData = abi.encode(
            wallet, AAVE_MARKET, uint256(_user.maxRatio), uint8(AaveV3SubProxy.RatioState.OVER)
        );
        sub.triggerData = new bytes[](1);
        sub.triggerData[0] = triggerData;

        sub.subData = new bytes32[](5);
        sub.subData[0] = bytes32(uint256(_user.targetRatioBoost)); // targetRatio
        sub.subData[1] = bytes32(uint256(0)); // ratioState = boost
        sub.subData[2] = bytes32(uint256(1)); // useDefaultMarket = true
        sub.subData[3] = bytes32(uint256(0)); // onBehalfOf = false
        sub.subData[4] = bytes32(uint256(1)); // enableAsColl = true
    }
}
