// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IAddressesRegistry } from "../../../contracts/interfaces/liquityV2/IAddressesRegistry.sol";
import { IStabilityPool } from "../../../contracts/interfaces/liquityV2/IStabilityPool.sol";
import { LiquityV2View } from "../../../contracts/views/LiquityV2View.sol";
import { LiquityV2SPDeposit } from "../../../contracts/actions/liquityV2/stabilityPool/LiquityV2SPDeposit.sol";

import { LiquityV2ExecuteActions } from "../../utils/executeActions/LiquityV2ExecuteActions.sol";
import {LiquityV2Utils} from "../../utils/liquityV2/LiquityV2Utils.sol";
import { SmartWallet } from "../../utils/SmartWallet.sol";

contract TestLiquityV2SPDeposit is LiquityV2ExecuteActions, LiquityV2Utils {

    /*//////////////////////////////////////////////////////////////////////////
                                CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    LiquityV2SPDeposit cut;

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

    struct TestSPDepositLocalParams {
        address collToken;
        address stabilityPool;
        uint256 depositAmount;
        bytes executeActionCallData;
        uint256 compoundedBOLD;
        uint256 collGain;
        uint256 boldGain;
        uint256 simulatedCollGain;
        uint256 compoundedBOLDAfter;
        uint256 collGainAfter;
        uint256 boldGainAfter;
        uint256 senderCollBalanceBefore;
        uint256 senderBoldBalanceBefore;
        uint256 senderCollBalanceAfter;
        uint256 senderBoldBalanceAfter;
    }

    /*//////////////////////////////////////////////////////////////////////////
                                   SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkMainnetLatest();

        wallet = new SmartWallet(bob);
        sender = wallet.owner();
        walletAddr = wallet.walletAddr();

        cut = new LiquityV2SPDeposit();
        viewContract = new LiquityV2View();

        markets = getMarkets();
        BOLD = markets[0].boldToken();
        WETH = markets[0].collToken();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                      TESTS
    ////////////////////////////////////////////////////////////////////////*/
    function test_should_deposit_without_claim() public {
        bool isDirect = false;
        bool shouldClaim = false;
        _baseTest(isDirect, shouldClaim);
    }

    function test_should_deposit_with_claim() public {
        bool isDirect = true;
        bool shouldClaim = true;
        _baseTest(isDirect, shouldClaim);
    }

    function _baseTest(bool _isDirect, bool _shouldClaim) public {
        for (uint256 i = 0; i < markets.length; i++) {
            _spDeposit(
                markets[i],
                _isDirect,
                _shouldClaim
            );
        }
    }

    function _spDeposit(
        IAddressesRegistry _market,
        bool _isDirect,
        bool _shouldClaim
    ) internal {
        TestSPDepositLocalParams memory vars;

        vars.collToken = _market.collToken();
        vars.depositAmount = amountInUSDPriceMock(BOLD, 10000, 1e8);
        vars.stabilityPool = _market.stabilityPool();
        vars.simulatedCollGain = 10000;
        _simulateCollGain(vars.stabilityPool, vars.simulatedCollGain, vars.collToken, walletAddr);

        give(BOLD, sender, vars.depositAmount);
        approveAsSender(sender, BOLD, walletAddr, vars.depositAmount);

        vars.executeActionCallData = executeActionCalldata(
            liquityV2SPDepositEncode(
                address(_market),
                sender,
                sender,
                sender,
                vars.depositAmount,
                false
            ),
            _isDirect
        );

        wallet.execute(address(cut), vars.executeActionCallData, 0);

        (vars.compoundedBOLD, vars.collGain, vars.boldGain) = viewContract
            .getDepositorInfo(address(_market), walletAddr);

        if (!_shouldClaim) {
            assertEq(vars.compoundedBOLD, vars.depositAmount);
            assertGe(vars.collGain, 0);
            assertGe(vars.boldGain, 0);
        } 
        else {
            give(BOLD, sender, vars.depositAmount);
            approveAsSender(sender, BOLD, walletAddr, vars.depositAmount);

            vars.executeActionCallData = executeActionCalldata(
                liquityV2SPDepositEncode(
                    address(_market),
                    sender,
                    sender,
                    sender,
                    vars.depositAmount,
                    true
                ),
                _isDirect
            );

            vars.senderCollBalanceBefore = balanceOf(vars.collToken, sender);
            vars.senderBoldBalanceBefore = balanceOf(BOLD, sender);

            wallet.execute(address(cut), vars.executeActionCallData, 0);

            vars.senderCollBalanceAfter = balanceOf(vars.collToken, sender);
            vars.senderBoldBalanceAfter = balanceOf(BOLD, sender);
            (vars.compoundedBOLDAfter, vars.collGainAfter, vars.boldGainAfter) = viewContract
                .getDepositorInfo(address(_market), walletAddr);

            assertEq(vars.senderCollBalanceAfter, vars.senderCollBalanceBefore + vars.collGain);
            assertEq(vars.senderBoldBalanceAfter, vars.senderBoldBalanceBefore - vars.depositAmount + vars.boldGain);
            assertEq(vars.compoundedBOLDAfter, vars.compoundedBOLD + vars.depositAmount);
            assertEq(vars.collGainAfter, 0);
            assertEq(vars.boldGainAfter, 0);
        }
    }
}