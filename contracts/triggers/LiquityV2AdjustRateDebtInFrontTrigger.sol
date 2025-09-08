// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import {ITrigger} from "../interfaces/ITrigger.sol";
import {IAddressesRegistry} from "../interfaces/liquityV2/IAddressesRegistry.sol";
import {ITroveManager} from "../interfaces/liquityV2/ITroveManager.sol";
import {IBorrowerOperations} from "../interfaces/liquityV2/IBorrowerOperations.sol";
import {ISortedTroves} from "../interfaces/liquityV2/ISortedTroves.sol";
import {IStabilityPool} from "../interfaces/liquityV2/IStabilityPool.sol";

import {LiquityV2Helper} from "../actions/liquityV2/helpers/LiquityV2Helper.sol";
import {TriggerHelper} from "./helpers/TriggerHelper.sol";
import {AdminAuth} from "../auth/AdminAuth.sol";
import {DSMath} from "../DS/DSMath.sol";
import {TransientStorageCancun} from "../utils/TransientStorageCancun.sol";

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
    LiquityV2Helper,
    DSMath
{
    /// @notice Transient storage contract for storing temporary data during execution
    TransientStorageCancun public constant tempStorage = TransientStorageCancun(TRANSIENT_STORAGE_CANCUN);
    
    /// @notice Error thrown when an invalid market address is provided
    error InvalidMarketAddress();

    /// @notice Cooldown period for interest rate adjustments (7 days)
    uint256 constant INTEREST_RATE_ADJ_COOLDOWN = 7 days;

    /// @notice Maximum number of iterations to get the debt in front for a current trove branch
    /// @dev Prevents infinite loops when traversing the sorted troves list
    uint256 internal constant MAX_ITERATIONS = 1000;

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

    /// @notice Helper struct containing debt information for a single LiquityV2 market
    /// @param totalDebt Total BOLD debt of the market (all troves combined)
    /// @param unbackedDebt Unbacked BOLD debt (difference between total debt and stability pool deposits)
    struct Market {
        uint256 totalDebt;
        uint256 unbackedDebt;
    }

    /// @notice Helper struct containing debt data for current and other markets
    /// @dev Used for estimating redemption amounts across all branches during debt in front calculation
    /// @param current The market we are calculating debt in front for
    /// @param otherMarkets Array containing the other two markets (branches)
    struct Markets {
        Market current;
        Market[] otherMarkets;
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

    /// @notice Calculates the total debt in front of a specific trove across all LiquityV2 branches
    /// @dev This function estimates the real debt in front by considering cross-branch redemptions.
    ///      Since redemptions are routed through every branch, the total debt in front is usually
    ///      higher than just the debt of preceding troves in the same branch.
    ///      
    ///      The calculation uses two main cases:
    ///      1. Current branch has unbacked debt: Uses unbacked debt proportions
    ///      2. Current branch has zero unbacked debt: Uses total debt proportions
    ///      
    ///      Mathematical approach:
    ///      X * branchRedeemPercentage = branchDebtInFront
    ///      X * (totalDebtOrUnbackedDebtOnBranch / totalDebtOrUnbackedDebt) = branchDebtInFront
    ///      X = branchDebtInFront * totalDebtOrUnbackedDebt / totalDebtOrUnbackedDebtOnBranch
    ///      Where X is the estimated redemption amount for which all debt in front will be redeemed.
    /// @param _market Address of the LiquityV2 market (branch) containing the trove
    /// @param _trove ID of the trove to calculate debt in front for
    /// @return debtInFront Total estimated debt in front of the trove across all branches
    function getDebtInFront(
        address _market,
        uint256 _trove
    ) public view returns (uint256) {
        (uint256 ethTotalDebt, uint256 ethUnbackedDebt) = _getTotalAndUnbackedDebt(WETH_MARKET_ADDR);
        (uint256 wstEthTotalDebt, uint256 wstEthUnbackedDebt) = _getTotalAndUnbackedDebt(WSTETH_MARKET_ADDR);
        (uint256 rEthTotalDebt, uint256 rEthUnbackedDebt) = _getTotalAndUnbackedDebt(RETH_MARKET_ADDR);

        uint256 totalUnbackedDebt = ethUnbackedDebt + wstEthUnbackedDebt + rEthUnbackedDebt;
        uint256 totalDebt = ethTotalDebt + wstEthTotalDebt + rEthTotalDebt;
        uint256 branchDebtInFront = _getTroveDebtInFrontForCurrentBranch(_market, _trove);

        Markets memory markets = _getMarketsData(
            _market,
            ethTotalDebt,
            ethUnbackedDebt,
            wstEthTotalDebt,
            wstEthUnbackedDebt,
            rEthTotalDebt,
            rEthUnbackedDebt
        );

        // Sanity check to avoid division by 0. Highly unlikely to ever happen.
        if (markets.current.totalDebt == 0) return 0;

        // CASE 1: Current branch has 0 unbacked debt
        // When totalUnbackedDebt is 0, redemptions will be proportional with the branch size and not to unbacked debt.
        // When unbacked debt is 0 for some branch, next redemption call won't touch that branch, so in order to estimate total debt in front we will:
        // - First add up all the unbacked debt from other branches, as that will be the only debt that will be redeemed on the fist redemption call
        // - Perform split the same way as we do when totalUnbackedDebt == 0, this would represent the second call to the redemption function
        if (markets.current.unbackedDebt == 0) {
            // If the branch debt in front is 0, it means that all debt in front is unbacked debt from other branches.
            if (branchDebtInFront == 0) {
                return markets.otherMarkets[0].unbackedDebt + markets.otherMarkets[1].unbackedDebt;
            }
            uint256 estimatedRedemptionAmount = branchDebtInFront * totalDebt / markets.current.totalDebt;
            uint256[] memory redemptionAmounts = _calculateRedemptionAmounts(
                estimatedRedemptionAmount,
                totalDebt,
                markets,
                false // isTotalUnbacked = false. Proportional to total debt
            );
            return branchDebtInFront + redemptionAmounts[0] + redemptionAmounts[1] + 
                   markets.otherMarkets[0].unbackedDebt + markets.otherMarkets[1].unbackedDebt;
        }

        // CASE 2: Current branch has unbacked debt
        uint256 estimatedRedemptionAmount = branchDebtInFront * totalUnbackedDebt / markets.current.unbackedDebt;
        uint256[] memory redemptionAmounts = _calculateRedemptionAmounts(
            estimatedRedemptionAmount,
            totalUnbackedDebt,
            markets,
            true // isTotalUnbacked = true. Proportional to total unbacked debt
        );
        return branchDebtInFront + redemptionAmounts[0] + redemptionAmounts[1];
    }

    /// @notice Parses the subscription data into SubParams struct
    /// @param _subData Encoded subscription parameters
    /// @return params Decoded SubParams struct
    function parseSubInputs(bytes memory _subData) public pure returns (SubParams memory params) {
        params = abi.decode(_subData, (SubParams));
    }

    /// @notice Returns the changed subscription data (not used in this trigger)
    /// @param _subData Original subscription data
    /// @return Empty bytes array as this trigger doesn't modify subscription data
    function changedSubData(bytes memory _subData) public pure override returns (bytes memory) {}

    /// @notice Returns whether the trigger parameters can be changed
    /// @return false This trigger does not support parameter changes
    function isChangeable() public pure override returns (bool) {
        return false;
    }

    /*//////////////////////////////////////////////////////////////
                            INTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

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

    function _calculateRedemptionAmounts(
        uint256 _estimatedRedemptionAmount,
        uint256 _total,
        Markets memory _markets,
        bool _isTotalUnbacked
    ) internal pure returns (uint256[] memory redemptionAmounts) {
        redemptionAmounts = new uint256[](2);
        for (uint256 i = 0; i < 2; ++i) {
            uint256 branchProportion = _isTotalUnbacked
                ? _markets.otherMarkets[i].unbackedDebt
                : _markets.otherMarkets[i].totalDebt;
            redemptionAmounts[i] = min(
                branchProportion * _estimatedRedemptionAmount / _total,
                _markets.otherMarkets[i].totalDebt
            );
        }
    }

    function _getTotalAndUnbackedDebt(
        address _market
    ) internal view returns (uint256 branchDebt, uint256 unbackedBold) {
        IAddressesRegistry registry = IAddressesRegistry(_market);
        branchDebt = IBorrowerOperations(registry.borrowerOperations()).getEntireBranchDebt();
        uint256 boldDeposits = IStabilityPool(registry.stabilityPool()).getTotalBoldDeposits();

        unbackedBold = branchDebt > boldDeposits ? branchDebt - boldDeposits : 0;
    }

    function _getTroveDebtInFrontForCurrentBranch(
        address _market,
        uint256 _troveId
    ) public view returns (uint256 debt) {
        ITroveManager troveManager = ITroveManager(IAddressesRegistry(_market).troveManager());
        ISortedTroves sortedTroves = ISortedTroves(IAddressesRegistry(_market).sortedTroves());

        uint256 next = _troveId;
        for (uint256 i = 0; i < MAX_ITERATIONS; ++i) {
            next = sortedTroves.getNext(next);
            if (next == 0) return debt;
            debt += _getTroveTotalDebt(troveManager, next);
        }
    }

    function _getTroveTotalDebt(
        ITroveManager _troveManager,
        uint256 _troveId
    ) internal view returns (uint256 debt) {
        ITroveManager.LatestTroveData memory latestTroveData = _troveManager.getLatestTroveData(_troveId);
        debt = latestTroveData.entireDebt;
    }

    function _getMarketsData(
        address _currentMarket,
        uint256 _ethTotalDebt,
        uint256 _ethUnbackedDebt,
        uint256 _wstEthTotalDebt,
        uint256 _wstEthUnbackedDebt,
        uint256 _rEthTotalDebt,
        uint256 _rEthUnbackedDebt
    ) internal pure returns (Markets memory retVal) {
        if (_currentMarket == WETH_MARKET_ADDR) {
            retVal.current = Market(_ethTotalDebt, _ethUnbackedDebt);
            retVal.otherMarkets = new Market[](2);
            retVal.otherMarkets[0] = Market(_wstEthTotalDebt, _wstEthUnbackedDebt);
            retVal.otherMarkets[1] = Market(_rEthTotalDebt, _rEthUnbackedDebt);
        } else if (_currentMarket == WSTETH_MARKET_ADDR) {
            retVal.current = Market(_wstEthTotalDebt, _wstEthUnbackedDebt);
            retVal.otherMarkets = new Market[](2);
            retVal.otherMarkets[0] = Market(_ethTotalDebt, _ethUnbackedDebt);
            retVal.otherMarkets[1] = Market(_rEthTotalDebt, _rEthUnbackedDebt);
        } else if (_currentMarket == RETH_MARKET_ADDR) {
            retVal.current = Market(_rEthTotalDebt, _rEthUnbackedDebt);
            retVal.otherMarkets = new Market[](2);
            retVal.otherMarkets[0] = Market(_ethTotalDebt, _ethUnbackedDebt);
            retVal.otherMarkets[1] = Market(_wstEthTotalDebt, _wstEthUnbackedDebt);
        } else {
            revert InvalidMarketAddress();
        }
    }
}
