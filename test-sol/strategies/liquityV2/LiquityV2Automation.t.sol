// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import {console} from "forge-std/Test.sol";

import {BaseTest} from "../../utils/BaseTest.sol";
import {SmartWallet} from "../../utils/SmartWallet.sol";
import {RegistryUtils} from "../../utils/RegistryUtils.sol";
import {Addresses} from "../../utils/Addresses.sol";
import {ActionsUtils} from "../../utils/ActionsUtils.sol";

import {IERC20} from "../../../contracts/interfaces/IERC20.sol";
import {IStabilityPool} from "../../../contracts/interfaces/liquityV2/IStabilityPool.sol";
import {IHintHelpers} from "../../../contracts/interfaces/liquityV2/IHintHelpers.sol";
import {IPriceFeed} from "../../../contracts/interfaces/liquityV2/IPriceFeed.sol";
import {IAddressesRegistry} from "../../../contracts/interfaces/liquityV2/IAddressesRegistry.sol";

import {LiquityV2Open} from "../../../contracts/actions/liquityV2/trove/LiquityV2Open.sol";
import {LiquityV2SPDeposit} from "../../../contracts/actions/liquityV2/stabilityPool/LiquityV2SPDeposit.sol";
import {LiquityV2RatioCheck} from "../../../contracts/actions/checkers/LiquityV2RatioCheck.sol";
import {LiquityV2View} from "../../../contracts/views/LiquityV2View.sol";
import {LiquityV2RatioTrigger} from "../../../contracts/triggers/LiquityV2RatioTrigger.sol";
import {LiquityV2TestHelper} from "./../../actions/liquityV2/LiquityV2TestHelper.t.sol";

import {SubProxy, StrategyModel} from "../../../contracts/core/strategy/SubProxy.sol";
import {SubStorage} from "../../../contracts/core/strategy/SubStorage.sol";
import {StrategyExecutor} from "../../../contracts/core/strategy/StrategyExecutor.sol";

contract TestLiquityV2Automation is BaseTest, LiquityV2TestHelper, RegistryUtils, ActionsUtils {
    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    LiquityV2Open openTrove;
    LiquityV2SPDeposit spDeposit;
    LiquityV2View liquityV2View;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    uint64 constant STRATEGY_OR_BUNDLE_ID = 113;

    SmartWallet wallet;
    address sender;
    address walletAddr;
    address WETH;
    IAddressesRegistry[] markets;
    LiquityV2RatioTrigger trigger;
    StrategyExecutor executor;
    uint256 troveId;

    StrategyModel.StrategySub sub;

    address[] STABILITY_POOLS = [
        0x5721cbbd64fc7Ae3Ef44A0A3F9a790A9264Cf9BF,
        0x9502b7c397E9aa22FE9dB7EF7DAF21cD2AEBe56B,
        0xd442E41019B7F5C4dD78F50dc03726C446148695
    ];

    struct TestSPDeposit {
        address collToken;
        address stabilityPool;
        uint256 depositAmount;
        bytes executeActionCallData;
        uint256 compoundedBOLD;
        uint256 collGain;
        uint256 boldGain;
        uint256 simulatedCollGain;
    }

    //    TODO -> Remove this
    uint256 internal constant WITHDRAW_FROM_SP_GAS_COST = 950_000;

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        // fork
        forkMainnetLatest();

        // basic setup
        wallet = new SmartWallet(bob);
        sender = wallet.owner();
        walletAddr = wallet.walletAddr();

        // set up liquityV2 contracts
        openTrove = new LiquityV2Open();
        spDeposit = new LiquityV2SPDeposit();
        liquityV2View = new LiquityV2View();

        markets = getMarkets();
        WETH = markets[0].collToken();

        // automation contracts
        trigger = new LiquityV2RatioTrigger();
        // ! REAL EXECUTOR !!!!!
        executor = StrategyExecutor(0xFaa763790b26E7ea354373072baB02e680Eeb07F);

        addBotCaller(address(this));
    }

    struct TestConfig {
        uint256 marketIndex;
        IAddressesRegistry market;
        uint256 triggerRatio;
        uint256 targetRatio;
        uint256 annualInterestRate;
        uint256 collateralAmountInUSD;
        uint256 borrowAmountInUSD;
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_LiquityV2_SP_LiquidationProtectionStrategy() public {
        // loops through all 3 markets -> WETH, wstETH, rETH
        for (uint256 i = 0; i < 3; i++) {
            TestConfig memory config = TestConfig({
                marketIndex: i,
                market: markets[i],
                triggerRatio: 1.5e18,
                targetRatio: 2e18,
                annualInterestRate: 1e16,
                collateralAmountInUSD: 200_000,
                borrowAmountInUSD: 150_000
            });

            _openTrove(config);

            (uint256 beforeRatio,) = trigger.getRatio(address(config.market), troveId);
            assertLe(beforeRatio, config.triggerRatio, "TRIGGER MUST BE TRIGGERABLE");

            uint256 depositBOLDInSPAmount = liquityV2View.getTroveInfo(address(config.market), troveId).debtAmount;
            // deposit ALL borrowed amount in SP
            _spDeposit(config.market, depositBOLDInSPAmount);
            _subToPaybackStrategy(config.market, config.triggerRatio, config.targetRatio);
            _executePaybackStrategy(config.market, config.targetRatio);
        }
    }

    /*//////////////////////////////////////////////////////////////////////////
                            HELPERS FOR EXECUTING STRATEGY
    //////////////////////////////////////////////////////////////////////////*/
    function _executePaybackStrategy(IAddressesRegistry _market, uint256 _targetRatio) internal {
        (uint256 beforeRatio,) = trigger.getRatio(address(_market), troveId);

        LiquityV2View.TroveData memory troveInfo = liquityV2View.getTroveInfo(address(_market), troveId);
        uint256 collAmountBefore = troveInfo.collAmount;
        uint256 borrowAmountBefore = troveInfo.debtAmount;
        uint256 depositedInSPBefore = IStabilityPool(_market.stabilityPool()).deposits(walletAddr);
        uint256 txFeeBalanceBefore = IERC20(BOLD_ADDR).balanceOf(Addresses.FEE_RECEIVER);
        uint256 amountToWithdrawFromSP = _calculateAmountToWIthdrawFromSP(_market, _targetRatio);
        uint256 dfsFee = amountToWithdrawFromSP * 0.0005e18 / 1e18;

        vm.txGasPrice(1e9);
        // stack too deep error fix
        {
            bytes[] memory _triggerCallData = new bytes[](1);
            bytes[] memory _actionsCallData = new bytes[](5);

            _actionsCallData[0] = liquityV2SPWithdrawEncode(
                address(_market), address(0), address(0), amountToWithdrawFromSP + dfsFee, false
            );
            _actionsCallData[1] = gasFeeEncode(WITHDRAW_FROM_SP_GAS_COST, address(0));
            _actionsCallData[2] = liquityV2PaybackEncode(address(0), address(0), 11, 0);
            _actionsCallData[3] = liquityV2RatioCheckEncode(address(0), 11, LiquityV2RatioCheck.RatioState.IN_REPAY, 0);

            uint256 subId = SubStorage(SUB_STORAGE_ADDR).getSubsCount() - 1;
            executor.executeStrategy(subId, STRATEGY_OR_BUNDLE_ID, _triggerCallData, _actionsCallData, sub);
        }

        console.log("==========================================================================================");
        console.log("==========================================================================================");
        console.log("==========================================================================================");
        console.log("AFTER EXECUTING STRATEGY");
        console.log("==========================================================================================");
        console.log("==========================================================================================");
        console.log("==========================================================================================");

        (uint256 afterRatio,) = trigger.getRatio(address(_market), troveId);
        assertGt(afterRatio, beforeRatio);
        assertGe(afterRatio, _targetRatio);
        assertApproxEqRel(afterRatio, _targetRatio, 0.0005e18);

        troveInfo = liquityV2View.getTroveInfo(address(_market), troveId);
        uint256 collAmountAfter = troveInfo.collAmount;
        uint256 borrowAmountAfter = troveInfo.debtAmount;
        uint256 depositedInSPAfter = IStabilityPool(_market.stabilityPool()).deposits(walletAddr);
        uint256 txFeeBalanceAfter = IERC20(BOLD_ADDR).balanceOf(Addresses.FEE_RECEIVER);
        uint256 feeBalanceDiff = txFeeBalanceAfter - txFeeBalanceBefore;

        // ! additional checks ->
        assertEq(collAmountAfter, collAmountBefore);
        assertGt(txFeeBalanceAfter, txFeeBalanceBefore, "TX BALANCE BAD ");
        assertEq(depositedInSPAfter, depositedInSPBefore - amountToWithdrawFromSP - dfsFee, "DEPOSITED IN SP BAD ");
        assertEq(
            borrowAmountAfter,
            borrowAmountBefore - amountToWithdrawFromSP - dfsFee + feeBalanceDiff,
            "BORROW AMOUNT BAD"
        );
    }

    function _calculateAmountToWIthdrawFromSP(IAddressesRegistry _market, uint256 _targetRatio)
        internal
        returns (uint256)
    {
        LiquityV2View.TroveData memory troveInfo = liquityV2View.getTroveInfo(address(_market), troveId);
        uint256 collateralAmountInUSD = troveInfo.collAmount * troveInfo.collPrice / 1e18;
        uint256 borrowAmountDesired = collateralAmountInUSD * 1e18 / _targetRatio;
        return troveInfo.debtAmount - borrowAmountDesired;
    }

    /*//////////////////////////////////////////////////////////////////////////
                                SUBSCRIBE
    //////////////////////////////////////////////////////////////////////////*/
    function _subToPaybackStrategy(IAddressesRegistry _market, uint256 _triggerRatio, uint256 _targetRatio) internal {
        SubProxy subProxy = new SubProxy();
        uint8 ratioStateEncoded = 1;
        bytes memory triggerData = abi.encode(address(_market), troveId, _triggerRatio, ratioStateEncoded);
        sub.isBundle = false;
        sub.strategyOrBundleId = STRATEGY_OR_BUNDLE_ID;

        // ! trigger data
        sub.triggerData = new bytes[](1);
        sub.triggerData[0] = triggerData;

        // ! sub data
        sub.subData = new bytes32[](5);
        sub.subData[0] = bytes32(uint256(uint160(address(_market))));
        sub.subData[1] = bytes32(troveId);
        sub.subData[2] = bytes32(uint256(uint160(BOLD_ADDR)));
        sub.subData[3] = bytes32(_targetRatio);
        sub.subData[4] = bytes32(uint256(ratioStateEncoded));

        bytes memory subscribeCallData = abi.encodeWithSelector(subProxy.subscribeToStrategy.selector, sub);
        wallet.execute(address(subProxy), subscribeCallData, 0);
    }

    /*//////////////////////////////////////////////////////////////////////////
                            DEPOSIT IN STABILITY POOL
    //////////////////////////////////////////////////////////////////////////*/
    function _spDeposit(IAddressesRegistry _market, uint256 _depositBOLDInSPAmount) internal {
        TestSPDeposit memory vars;

        vars.collToken = _market.collToken();
        vars.depositAmount = _depositBOLDInSPAmount;
        vars.stabilityPool = _market.stabilityPool();
        vars.simulatedCollGain = 100;

        _simulateCollGain(vars);
        giveTokenAndApproveAsSender(sender, BOLD_ADDR, walletAddr, vars.depositAmount);

        vars.executeActionCallData = executeActionCalldata(
            liquityV2SPDepositEncode(address(_market), sender, sender, sender, vars.depositAmount, false), true
        );
        wallet.execute(address(spDeposit), vars.executeActionCallData, 0);

        (vars.compoundedBOLD, vars.collGain, vars.boldGain) =
            liquityV2View.getDepositorInfo(address(_market), walletAddr);
        assertEq(vars.compoundedBOLD, vars.depositAmount);
        assertGe(vars.collGain, 100);
        assertGe(vars.boldGain, 0);
    }

    function _simulateCollGain(TestSPDeposit memory _vars) internal {
        uint256 collBalanceStorageSlot = 3;
        uint256 stashedCollMappingSlot = 9;
        vm.store(_vars.stabilityPool, bytes32(collBalanceStorageSlot), bytes32(_vars.simulatedCollGain));
        vm.store(
            _vars.stabilityPool,
            keccak256(abi.encode(walletAddr, stashedCollMappingSlot)),
            bytes32(_vars.simulatedCollGain)
        );
        give(_vars.collToken, _vars.stabilityPool, _vars.simulatedCollGain * 2);
    }

    /*//////////////////////////////////////////////////////////////////////////
                                OPEN TROVE
    //////////////////////////////////////////////////////////////////////////*/

    function _openTrove(TestConfig memory _config) internal {
        address collToken = _config.market.collToken();
        IHintHelpers hintHelpers = IHintHelpers(_config.market.hintHelpers());
        (uint256 upperHint, uint256 lowerHint) =
            getInsertPosition(liquityV2View, _config.market, _config.marketIndex, _config.annualInterestRate);

        uint256 collPriceWAD = IPriceFeed(_config.market.priceFeed()).lastGoodPrice();
        uint256 collAmount = amountInUSDPriceMock(collToken, _config.collateralAmountInUSD, collPriceWAD / 1e10);
        uint256 borrowAmount = amountInUSDPriceMock(BOLD_ADDR, _config.borrowAmountInUSD, 1e8);
        uint256 predictMaxUpfrontFee =
            hintHelpers.predictOpenTroveUpfrontFee(_config.marketIndex, borrowAmount, _config.annualInterestRate);

        LiquityV2Open.Params memory params = LiquityV2Open.Params({
            market: address(_config.market),
            from: sender,
            to: sender,
            interestBatchManager: address(0),
            ownerIndex: 0,
            collAmount: collAmount,
            boldAmount: borrowAmount,
            upperHint: upperHint,
            lowerHint: lowerHint,
            annualInterestRate: _config.annualInterestRate,
            maxUpfrontFee: predictMaxUpfrontFee
        });

        _openTroveLogic(params, collToken);
    }

    function _openTroveLogic(LiquityV2Open.Params memory _params, address _collToken) internal {
        if (_collToken == WETH) {
            giveTokenAndApproveAsSender(sender, WETH, walletAddr, _params.collAmount + ETH_GAS_COMPENSATION);
        } else {
            giveTokenAndApproveAsSender(sender, _collToken, walletAddr, _params.collAmount);
            giveTokenAndApproveAsSender(sender, WETH, walletAddr, ETH_GAS_COMPENSATION);
        }

        bytes memory executeActionCallData = executeActionCalldata(
            liquityV2OpenEncode(
                _params.market,
                _params.from,
                _params.to,
                _params.interestBatchManager,
                _params.ownerIndex,
                _params.collAmount,
                _params.boldAmount,
                _params.upperHint,
                _params.lowerHint,
                _params.annualInterestRate,
                _params.maxUpfrontFee
            ),
            true
        );

        uint256 senderWethBalanceBefore = balanceOf(WETH, sender);
        uint256 senderCollBalanceBefore = balanceOf(_collToken, sender);

        wallet.execute(address(openTrove), executeActionCallData, 0);

        uint256 senderWethBalanceAfter = balanceOf(WETH, sender);
        uint256 senderCollBalanceAfter = balanceOf(_collToken, sender);

        if (_collToken == WETH) {
            assertEq(senderWethBalanceBefore - senderWethBalanceAfter, _params.collAmount + ETH_GAS_COMPENSATION);
        } else {
            assertEq(senderCollBalanceBefore - senderCollBalanceAfter, _params.collAmount);
            assertEq(senderWethBalanceBefore - senderWethBalanceAfter, ETH_GAS_COMPENSATION);
        }

        troveId = uint256(keccak256(abi.encode(walletAddr, walletAddr, 0)));
        LiquityV2View.TroveData memory troveData = liquityV2View.getTroveInfo(_params.market, troveId);

        assertEq(troveData.collAmount, _params.collAmount);
        assertEq(troveData.annualInterestRate, _params.annualInterestRate);
        assertEq(troveData.interestBatchManager, _params.interestBatchManager);
        assertGe(troveData.debtAmount, _params.boldAmount);
    }
}
