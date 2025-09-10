// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import {ITrigger} from "../interfaces/ITrigger.sol";

import {LiquityV2Helper} from "../actions/liquityV2/helpers/LiquityV2Helper.sol";
import {TriggerHelper} from "./helpers/TriggerHelper.sol";
import {AdminAuth} from "../auth/AdminAuth.sol";
import {DSMath} from "../DS/DSMath.sol";
import {TransientStorageCancun} from "../utils/TransientStorageCancun.sol";
import {IAddressesRegistry} from "../interfaces/liquityV2/IAddressesRegistry.sol";
import {ITroveManager} from "../interfaces/liquityV2/ITroveManager.sol";
import {IBorrowerOperations} from "../interfaces/liquityV2/IBorrowerOperations.sol";

/// @title LiquityV2 Interest Rate Adjustment Debt in Front Trigger
/// @notice Triggers when the calculated debt in front of a LiquityV2 trove falls below specified thresholds,
///         enabling automatic interest rate adjustments to protect from redemptions.
/// @dev This trigger monitors debt in front across all LiquityV2 branches (ETH, wstETH, rETH) and triggers
///      when conditions are met for interest rate adjustment. It considers both critical and non-critical
///      debt thresholds, with different logic based on whether adjustment fees are zero.
/// @author DeFi Saver
contract LiquityV2AdjustRateDebtInFrontTrigger is
    ITrigger,
    AdminAuth,
    TriggerHelper,
    LiquityV2Helper
{
    /// @notice Transient storage contract for storing temporary data during execution
    TransientStorageCancun public constant tempStorage = TransientStorageCancun(TRANSIENT_STORAGE_CANCUN);


    /// @notice Parameters for the LiquityV2 interest rate adjustment trigger
    /// @param market Address of the LiquityV2 market (branch) to monitor
    /// @param troveId ID of the trove to monitor for debt in front
    /// @param criticalDebtInFrontLimit Critical threshold - strategy executes when debt in front is below this limit
    /// @param nonCriticalDebtInFrontLimit Non-critical threshold - strategy executes when debt in front is below this limit AND adjustment fee is zero
    struct SubParams {
        address market;
        uint256 troveId;
        uint256 criticalDebtInFrontLimit;
        uint256 nonCriticalDebtInFrontLimit;
    }

    /// @notice Checks if the debt in front of the trove is below the specified thresholds
    /// @dev This function determines whether to trigger the interest rate adjustment strategy based on:
    ///      1. Whether the trove is eligible for interest rate adjustment (active, no batch manager, cooldown passed)
    ///      2. Whether the debt in front is below the critical or non-critical thresholds
    ///      3. Whether adjustment fees are zero (affects which threshold to use)
    /// @param _subData Encoded SubParams struct containing market, troveId, and threshold limits
    /// @return bool True if the strategy should be triggered, false otherwise
    function isTriggered(bytes memory, bytes memory _subData) public override returns (bool) {
        SubParams memory triggerSubData = parseSubInputs(_subData);

        
        (bool isAdjustmentFeeZero, uint256 interestRate, bool shouldExecuteStrategy) = getAdjustmentFeeAndInterestRate(triggerSubData.market, triggerSubData.troveId);
        
        if (!shouldExecuteStrategy) {
            return false;
        }
        uint256 debtInFront = getDebtInFront(triggerSubData.market, triggerSubData.troveId);

        tempStorage.setBytes32("LIQUITY_V2_INTEREST_RATE", bytes32(interestRate));
        
        if (isAdjustmentFeeZero) {
            return debtInFront < triggerSubData.nonCriticalDebtInFrontLimit;
        } else {
            return debtInFront < triggerSubData.criticalDebtInFrontLimit;
        }
    }

    /// @notice Checks if the trove is eligible for interest rate adjustment and gets current interest rate
    /// @dev Validates that the trove is active, has no batch manager, and checks if cooldown period has passed
    /// @param _market Address of the LiquityV2 market
    /// @param _troveId ID of the trove to check
    /// @return adjustmentFeeZero True if adjustment fee is zero (cooldown period has passed)
    /// @return interestRate Current annual interest rate of the trove
    /// @return shouldExecuteStrategy True if the trove is eligible for interest rate adjustment
    function getAdjustmentFeeAndInterestRate(address _market, uint256 _troveId) internal view returns (bool adjustmentFeeZero, uint256 interestRate, bool shouldExecuteStrategy) {
        IAddressesRegistry market = IAddressesRegistry(_market);
        ITroveManager troveManager = ITroveManager(market.troveManager());
        IBorrowerOperations borrowerOperations = IBorrowerOperations(market.borrowerOperations());

        // return false if trove has an interest batch manager
        if (borrowerOperations.interestBatchManagerOf(_troveId) != address(0)) {
            return (false, 0, false);
        }

        // return false if trove is not active
        if (troveManager.getTroveStatus(_troveId) != ITroveManager.Status.active) {
            return (false, 0, false);
        }

        ITroveManager.LatestTroveData memory troveData = troveManager.getLatestTroveData(_troveId);

        return (block.timestamp >= troveData.lastInterestRateAdjTime + INTEREST_RATE_ADJ_COOLDOWN, troveData.annualInterestRate, true);
    }


    function parseSubInputs(bytes memory _subData) public pure returns (SubParams memory params) {
        params = abi.decode(_subData, (SubParams));
    }

    function changedSubData(bytes memory _subData) public pure override returns (bytes memory) {}

    function isChangeable() public pure override returns (bool) {
        return false;
    }
}
