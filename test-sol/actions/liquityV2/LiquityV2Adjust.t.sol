// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IAddressesRegistry } from "../../../contracts/interfaces/liquityV2/IAddressesRegistry.sol";
import { IPriceFeed } from "../../../contracts/interfaces/liquityV2/IPriceFeed.sol";
import { IHintHelpers } from "../../../contracts/interfaces/liquityV2/IHintHelpers.sol";
import { ITroveManager } from "../../../contracts/interfaces/liquityV2/ITroveManager.sol";
import { LiquityV2Open } from "../../../contracts/actions/liquityV2/trove/LiquityV2Open.sol";
import { LiquityV2View } from "../../../contracts/views/LiquityV2View.sol";
import { LiquityV2Adjust } from "../../../contracts/actions/liquityV2/trove/LiquityV2Adjust.sol";

import { LiquityV2ExecuteActions } from "../../utils/executeActions/LiquityV2ExecuteActions.sol";
import { SmartWallet } from "../../utils/SmartWallet.sol";

contract TestLiquityV2Adjust is LiquityV2ExecuteActions {
    /*//////////////////////////////////////////////////////////////////////////
                                CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    LiquityV2Adjust cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/

    SmartWallet wallet;
    address sender;
    address walletAddr;
    IAddressesRegistry[] markets;
    address BOLD;
    address WETH;

    LiquityV2View viewContract;
    LiquityV2Open openContract;

    struct TestConfig {
        bool isDirect;
        address interestBatchManager;
        uint256 supplyAmountInUSD;
        uint256 withdrawAmountInUSD;
        uint256 borrowAmountInUSD;
        uint256 paybackAmountInUSD;
        uint256 openCollateralAmountInUSD;
        uint256 openBorrowAmountInUSD;
    }

    struct TestAdjustLocalVars {
        address collToken;
        uint256 collPriceWAD;
        uint256 supplyAmount;
        uint256 paybackAmount;
        uint256 withdrawAmount;
        uint256 borrowAmount;
        uint256 collAmount;
        uint256 debtAmount;
        uint256 maxUpfrontFee;
        bytes executeActionCallData;
        uint256 senderCollBalanceBefore;
        uint256 senderCollBalanceAfter;
        uint256 senderBoldBalanceBefore;
        uint256 senderBoldBalanceAfter;
        LiquityV2Adjust.CollActionType collAction;
        LiquityV2Adjust.DebtActionType debtAction;
        LiquityV2View.TroveData troveDataBefore;
        LiquityV2View.TroveData troveDataAfter;
    }

    /*//////////////////////////////////////////////////////////////////////////
                                   SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkMainnet("LiquityV2Adjust");

        wallet = new SmartWallet(bob);
        sender = wallet.owner();
        walletAddr = wallet.walletAddr();

        cut = new LiquityV2Adjust();
        viewContract = new LiquityV2View();
        openContract = new LiquityV2Open();

        markets = getMarkets();
        BOLD = markets[0].boldToken();
        WETH = markets[0].collToken();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                      TESTS
    ////////////////////////////////////////////////////////////////////////*/
    function test_should_adjust_supply_borrow() public {
        _baseTest(
            TestConfig({
                isDirect: false,
                interestBatchManager: address(0),
                supplyAmountInUSD: 30_000,
                withdrawAmountInUSD: 0,
                borrowAmountInUSD: 10_000,
                paybackAmountInUSD: 0,
                openCollateralAmountInUSD: 40_000,
                openBorrowAmountInUSD: 5000
            })
        );
    }

    function test_should_adjust_withdraw_payback() public {
        _baseTest(
            TestConfig({
                isDirect: true,
                interestBatchManager: address(0xdeadbeaf),
                supplyAmountInUSD: 0,
                withdrawAmountInUSD: 10_000,
                borrowAmountInUSD: 0,
                paybackAmountInUSD: 10_000,
                openCollateralAmountInUSD: 40_000,
                openBorrowAmountInUSD: 15_000
            })
        );
    }

    function test_should_adjust_supply_payback() public {
        _baseTest(
            TestConfig({
                isDirect: true,
                interestBatchManager: address(0xdeadbeaf),
                supplyAmountInUSD: 10_000,
                withdrawAmountInUSD: 0,
                borrowAmountInUSD: 0,
                paybackAmountInUSD: 10_000,
                openCollateralAmountInUSD: 40_000,
                openBorrowAmountInUSD: 15_000
            })
        );
    }

    function test_should_adjust_withdraw_borrow() public {
        _baseTest(
            TestConfig({
                isDirect: true,
                interestBatchManager: address(0xdeadbeaf),
                supplyAmountInUSD: 0,
                withdrawAmountInUSD: 5000,
                borrowAmountInUSD: 10_000,
                paybackAmountInUSD: 0,
                openCollateralAmountInUSD: 50_000,
                openBorrowAmountInUSD: 15_000
            })
        );
    }

    function _baseTest(TestConfig memory _config) public {
        for (uint256 i = 0; i < markets.length; i++) {
            if (_config.interestBatchManager != address(0)) {
                vm.startPrank(_config.interestBatchManager);
                registerBatchManager(markets[i]);
                vm.stopPrank();
            }
            uint256 troveId = executeLiquityOpenTrove(
                markets[i],
                _config.interestBatchManager,
                _config.openCollateralAmountInUSD,
                i,
                _config.openBorrowAmountInUSD,
                1e18 / 10,
                0,
                wallet,
                openContract,
                viewContract
            );
            _adjust(markets[i], troveId, _config, i);
        }
    }

    function _adjust(IAddressesRegistry _market, uint256 _troveId, TestConfig memory _config, uint256 _collIndex)
        internal
    {
        TestAdjustLocalVars memory vars;

        vars.troveDataBefore = viewContract.getTroveInfo(address(_market), _troveId);
        vars.collToken = _market.collToken();
        vars.collPriceWAD = IPriceFeed(_market.priceFeed()).lastGoodPrice();

        vars.supplyAmount = _config.supplyAmountInUSD > 0
            ? amountInUSDPriceMock(vars.collToken, _config.supplyAmountInUSD, vars.collPriceWAD / 1e10)
            : 0;

        vars.paybackAmount =
            _config.paybackAmountInUSD > 0 ? amountInUSDPriceMock(BOLD, _config.paybackAmountInUSD, 1e18) : 0;

        vars.withdrawAmount = _config.withdrawAmountInUSD > 0
            ? amountInUSDPriceMock(vars.collToken, _config.withdrawAmountInUSD, vars.collPriceWAD / 1e10)
            : 0;

        vars.borrowAmount =
            _config.borrowAmountInUSD > 0 ? amountInUSDPriceMock(BOLD, _config.borrowAmountInUSD, 1e18) : 0;

        vars.collAmount = vars.supplyAmount > 0 ? vars.supplyAmount : vars.withdrawAmount;
        vars.debtAmount = vars.borrowAmount > 0 ? vars.borrowAmount : vars.paybackAmount;

        vars.collAction =
            vars.supplyAmount > 0 ? LiquityV2Adjust.CollActionType.SUPPLY : LiquityV2Adjust.CollActionType.WITHDRAW;

        vars.debtAction =
            vars.borrowAmount > 0 ? LiquityV2Adjust.DebtActionType.BORROW : LiquityV2Adjust.DebtActionType.PAYBACK;

        if (_config.supplyAmountInUSD > 0) {
            give(vars.collToken, sender, vars.supplyAmount);
            approveAsSender(sender, vars.collToken, walletAddr, vars.supplyAmount);
        }

        if (_config.paybackAmountInUSD > 0) {
            give(BOLD, sender, vars.paybackAmount);
            approveAsSender(sender, BOLD, walletAddr, vars.paybackAmount);
        }

        vars.maxUpfrontFee = vars.borrowAmount == 0
            ? 0
            : IHintHelpers(_market.hintHelpers()).predictAdjustTroveUpfrontFee(_collIndex, _troveId, vars.borrowAmount);

        vars.executeActionCallData = executeActionCalldata(
            liquityV2AdjustEncode(
                address(_market),
                sender,
                sender,
                _troveId,
                vars.collAmount,
                vars.debtAmount,
                vars.maxUpfrontFee,
                vars.collAction,
                vars.debtAction
            ),
            _config.isDirect
        );

        vars.senderCollBalanceBefore = balanceOf(vars.collToken, sender);
        vars.senderBoldBalanceBefore = balanceOf(BOLD, sender);

        wallet.execute(address(cut), vars.executeActionCallData, 0);

        vars.senderCollBalanceAfter = balanceOf(vars.collToken, sender);
        vars.senderBoldBalanceAfter = balanceOf(BOLD, sender);
        vars.troveDataAfter = viewContract.getTroveInfo(address(_market), _troveId);

        if (vars.collAction == LiquityV2Adjust.CollActionType.WITHDRAW) {
            assertEq(vars.senderCollBalanceAfter, vars.senderCollBalanceBefore + vars.withdrawAmount);
            assertEq(vars.troveDataAfter.collAmount, vars.troveDataBefore.collAmount - vars.withdrawAmount);
        } else {
            assertEq(vars.senderCollBalanceAfter, vars.senderCollBalanceBefore - vars.supplyAmount);
            assertEq(vars.troveDataAfter.collAmount, vars.troveDataBefore.collAmount + vars.supplyAmount);
        }

        if (vars.debtAction == LiquityV2Adjust.DebtActionType.PAYBACK) {
            assertEq(vars.senderBoldBalanceAfter, vars.senderBoldBalanceBefore - vars.paybackAmount);
            assertGe(vars.troveDataAfter.debtAmount, vars.troveDataBefore.debtAmount - vars.paybackAmount);
        } else {
            assertEq(vars.senderBoldBalanceAfter, vars.senderBoldBalanceBefore + vars.borrowAmount);
            assertGe(vars.troveDataAfter.debtAmount, vars.troveDataBefore.debtAmount + vars.borrowAmount);
        }
    }
}
