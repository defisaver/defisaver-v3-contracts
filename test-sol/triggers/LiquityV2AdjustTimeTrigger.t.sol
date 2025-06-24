// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IAddressesRegistry } from "../../contracts/interfaces/liquityV2/IAddressesRegistry.sol";
import { ITroveManager } from "../../contracts/interfaces/liquityV2/ITroveManager.sol";
import { IBorrowerOperations } from "../../contracts/interfaces/liquityV2/IBorrowerOperations.sol";
import { IHintHelpers } from "../../contracts/interfaces/liquityV2/IHintHelpers.sol";
import { LiquityV2Open } from "../../contracts/actions/liquityV2/trove/LiquityV2Open.sol";
import { LiquityV2View } from "../../contracts/views/LiquityV2View.sol";
import { LiquityV2AdjustInterestRate } from "../../contracts/actions/liquityV2/trove/LiquityV2AdjustInterestRate.sol";
import { LiquityV2AdjustTimeTrigger } from "../../contracts/triggers/LiquityV2AdjustTimeTrigger.sol";

import { LiquityV2ExecuteActions } from "../utils/executeActions/LiquityV2ExecuteActions.sol";
import { SmartWallet } from "../utils/SmartWallet.sol";

contract TestLiquityV2AdjustTimeTrigger is LiquityV2ExecuteActions {

    /*//////////////////////////////////////////////////////////////////////////
                                CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    LiquityV2AdjustTimeTrigger cut;

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
    LiquityV2AdjustInterestRate adjustInterestRateContract;

    /*//////////////////////////////////////////////////////////////////////////
                                   SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkMainnetLatest();

        wallet = new SmartWallet(bob);
        sender = wallet.owner();
        walletAddr = wallet.walletAddr();

        cut = new LiquityV2AdjustTimeTrigger();
        viewContract = new LiquityV2View();
        openContract = new LiquityV2Open();
        adjustInterestRateContract = new LiquityV2AdjustInterestRate();

        markets = getMarkets();
        BOLD = markets[0].boldToken();
        WETH = markets[0].WETH();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                      TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_trigger_not_active_time_not_passed() public {
        for (uint256 i = 0; i < markets.length; i++) {
            uint256 troveId = _openTroveAndAdjustInterestRate(markets[i], i);
            
            // Check trigger immediately after adjustment (should be false)
            bool isTriggered = cut.isAdjustmentFeeZero(address(markets[i]), troveId);
            assertFalse(isTriggered, "Trigger should not be active immediately after adjustment");

            // Advance time by 6 days (still less than 7 days cooldown)
            vm.warp(block.timestamp + 6 days);
            
            isTriggered = cut.isAdjustmentFeeZero(address(markets[i]), troveId);
            assertFalse(isTriggered, "Trigger should not be active before 7 days cooldown");
        }
    }

    function _test_trigger_active_time_passed() public {
        for (uint256 i = 0; i < markets.length; i++) {
            uint256 troveId = _openTroveAndAdjustInterestRate(markets[i], i);
            
            // Check trigger immediately after adjustment (should be false)
            bool isTriggered = cut.isAdjustmentFeeZero(address(markets[i]), troveId);
            assertFalse(isTriggered, "Trigger should not be active immediately after adjustment");

            // Advance time by exactly 7 days
            vm.warp(block.timestamp + 7 days);
            
            isTriggered = cut.isAdjustmentFeeZero(address(markets[i]), troveId);
            assertTrue(isTriggered, "Trigger should be active after exactly 7 days cooldown");

            // Test with more than 7 days
            vm.warp(block.timestamp + 1 days); // Now 8 days total
            
            isTriggered = cut.isAdjustmentFeeZero(address(markets[i]), troveId);
            assertTrue(isTriggered, "Trigger should be active after more than 7 days cooldown");
        }
    }

    function _test_trigger_not_active_trove_has_batch_manager() public {
        address batchManager = address(0xdeadbeef);
        
        for (uint256 i = 0; i < markets.length; i++) {
            // Register batch manager first
            vm.startPrank(batchManager);
            registerBatchManager(markets[i]);
            vm.stopPrank();

            // Open trove with batch manager
            uint256 troveId = executeLiquityOpenTrove(
                markets[i],
                batchManager, // Use batch manager
                30000, // collAmountInUSD
                i, // collIndex
                10000, // borrowAmountInUSD
                1e18 / 10, // annualInterestRate (10%)
                0, // nonce
                wallet,
                openContract,
                viewContract
            );

            // Verify the trove actually has a batch manager
            IBorrowerOperations borrowerOperations = IBorrowerOperations(markets[i].borrowerOperations());
            address trovesBatchManager = borrowerOperations.interestBatchManagerOf(troveId);
            assertEq(trovesBatchManager, batchManager, "Trove should have the batch manager set");

            // Check trigger immediately (should be false due to batch manager)
            bool isTriggered = cut.isAdjustmentFeeZero(address(markets[i]), troveId);
            assertFalse(isTriggered, "Trigger should not be active for trove with batch manager");

            // Even after 7+ days, should still be false due to batch manager
            vm.warp(block.timestamp + 8 days);
            
            isTriggered = cut.isAdjustmentFeeZero(address(markets[i]), troveId);
            assertFalse(isTriggered, "Trigger should not be active for trove with batch manager even after cooldown");
        }
    }

    function _test_trigger_not_active_trove_not_active() public {
        for (uint256 i = 0; i < markets.length; i++) {
            uint256 troveId = _openTroveAndAdjustInterestRate(markets[i], i);
            
            // Verify trove is active first
            ITroveManager troveManager = ITroveManager(markets[i].troveManager());
            ITroveManager.Status status = troveManager.getTroveStatus(troveId);
            assertEq(uint256(status), uint256(ITroveManager.Status.active), "Trove should be active");

            // Advance time so trigger would be active if trove was active
            vm.warp(block.timestamp + 8 days);
            
            // Check trigger is active for active trove
            bool isTriggered = cut.isAdjustmentFeeZero(address(markets[i]), troveId);
            assertTrue(isTriggered, "Trigger should be active for active trove after cooldown");

            // Now close the trove to make it inactive
            _closeTrove(markets[i], troveId);

            // Verify trove is now closed
            status = troveManager.getTroveStatus(troveId);
            assertEq(uint256(status), uint256(ITroveManager.Status.closedByOwner), "Trove should be closed");

            // Check trigger is now false due to trove being inactive
            isTriggered = cut.isAdjustmentFeeZero(address(markets[i]), troveId);
            assertFalse(isTriggered, "Trigger should not be active for closed trove");
        }
    }

    /*//////////////////////////////////////////////////////////////////////////
                                HELPER FUNCTIONS
    //////////////////////////////////////////////////////////////////////////*/

    /// @dev Opens a trove and adjusts its interest rate to set the adjustment time
    function _openTroveAndAdjustInterestRate(IAddressesRegistry _market, uint256 _collIndex) internal returns (uint256 troveId) {
        uint256 collAmountInUSD = 30000;
        uint256 borrowAmountInUSD = 10000;
        uint256 initialInterestRate = 1e18 / 10; // 10%
        uint256 newInterestRate = 1e18 / 20; // 5%

        // Open trove without batch manager
        troveId = executeLiquityOpenTrove(
            _market,
            address(0), // no batch manager
            collAmountInUSD,
            _collIndex,
            borrowAmountInUSD,
            initialInterestRate,
            0,
            wallet,
            openContract,
            viewContract
        );

        // Adjust interest rate to set the lastInterestRateAdjTime
        _adjustInterestRate(_market, troveId, newInterestRate, _collIndex);
    }

    /// @dev Helper function to adjust interest rate
    function _adjustInterestRate(
        IAddressesRegistry _market,
        uint256 _troveId,
        uint256 _newInterestRate,
        uint256 _collIndex
    ) internal {
        uint256 maxUpfrontFee = IHintHelpers(_market.hintHelpers()).predictAdjustInterestRateUpfrontFee(
            _collIndex,
            _troveId,
            _newInterestRate
        );

        (uint256 upperHint, uint256 lowerHint) = getInsertPosition(
            viewContract,
            _market,
            _collIndex,
            _newInterestRate
        );

        bytes memory executeActionCallData = executeActionCalldata(
            liquityV2AdjustInterestRateEncode(
                address(_market),
                _troveId,
                _newInterestRate,
                upperHint,
                lowerHint,
                maxUpfrontFee
            ),
            true // isDirect
        );

        wallet.execute(address(adjustInterestRateContract), executeActionCallData, 0);
    }

    /// @dev Helper function to close a trove
    function _closeTrove(IAddressesRegistry _market, uint256 _troveId) internal {
        // Get the trove debt to repay
        ITroveManager troveManager = ITroveManager(_market.troveManager());
        ITroveManager.LatestTroveData memory troveData = troveManager.getLatestTroveData(_troveId);
        
        // Give wallet enough BOLD to close the trove
        give(BOLD, sender, troveData.entireDebt);
        wallet.ownerApprove(BOLD, troveData.entireDebt);

        // Close the trove via borrower operations
        IBorrowerOperations borrowerOperations = IBorrowerOperations(_market.borrowerOperations());
        vm.startPrank(walletAddr);
        borrowerOperations.closeTrove(_troveId);
        vm.stopPrank();
    }
}
