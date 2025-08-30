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

/// @title Trigger contract that triggers if calculated debt in front of a trove is below a certain threshold
/// @notice This trigger takes all the branches into account
contract LiquityV2DebtInFrontTrigger is
    ITrigger,
    AdminAuth,
    TriggerHelper,
    LiquityV2Helper,
    DSMath
{
    /// @notice Error thrown when an invalid market address is provided
    error InvalidMarketAddress();

    /// @notice Maximum number of iterations to get the debt in front for a current trove branch
    uint256 internal constant MAX_ITERATIONS = 1000;

    /// @param market address of the market
    /// @param troveId id of the trove
    /// @param debtInFrontMin minimum debt in front, below which the trigger will be triggered
    struct SubParams {
        address market;
        uint256 troveId;
        uint256 debtInFrontMin;
    }

    /// @notice Helper struct containing the total debt and unbacked debt of a single market
    /// @dev totalDebt is the total bold debt of the market
    /// @dev unbackedDebt is the unbacked bold debt of the market. Diff between total debt and stability pool bold deposits
    struct Market {
        uint256 totalDebt;
        uint256 unbackedDebt;
    }

    /// @notice Helper struct containing the current market and other markets data.
    /// @notice Used for estimating the redemption amounts per market
    /// @dev current is the current market we are calculating the debt in front for
    /// @dev otherMarkets are the 2 other markets
    struct Markets {
        Market current;
        Market[] otherMarkets;
    }

    /// @notice Checks if the debt in front of the trove is below the minimum debt in front
    /// @param _subData bytes encoded SubParams struct
    /// @return bool true if the debt in front of the trove is below the minimum debt in front
    function isTriggered(bytes memory, bytes memory _subData) public view override returns (bool) {
        SubParams memory triggerSubData = parseSubInputs(_subData);

        uint256 debtInFront = getDebtInFront(triggerSubData.market, triggerSubData.troveId);

        return debtInFront < triggerSubData.debtInFrontMin;
    }

    /// @notice Gets the debt in front for a given market and trove
    /// @param _market address of the market (a.k.a. branch)
    /// @param _trove id of the trove
    /// @return debtInFront debt in front of the trove
    /// @dev This function estimates the total real debt in front of a given trove.
    /// Because redemptions are routed through every branch, the total debt in front 
    /// is usually higher than the debt of the troves preceding the current trove in its given branch.
    /// General equation:
    /// X * branchRedeemPercentage = branchDebtInFront
    /// X * (totalDebtOrUnbackedDebtOnBranch / totalDebtOrUnbackedDebt) = branchDebtInFront
    /// X = branchDebtInFront * totalDebtOrUnbackedDebt / totalDebtOrUnbackedDebtOnBranch
    /// Where X is the estimated redemption amount for which all debt in front of the trove in its branch will be redeemed.
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

    function parseSubInputs(bytes memory _subData) public pure returns (SubParams memory params) {
        params = abi.decode(_subData, (SubParams));
    }

    function changedSubData(bytes memory _subData) public pure override returns (bytes memory) {}

    function isChangeable() public pure override returns (bool) {
        return false;
    }

    /*//////////////////////////////////////////////////////////////
                            INTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/
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
