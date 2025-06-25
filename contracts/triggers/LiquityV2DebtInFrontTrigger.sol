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

/// @title Trigger contract that triggers if calculated debt in front of a trove is below a certain threshold
/// @notice This trigger takes all the branches into account
contract LiquityV2DebtInFrontTrigger is
    ITrigger,
    AdminAuth,
    TriggerHelper,
    LiquityV2Helper
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

    /// @dev checks if the adjust time has passed
    function isTriggered(bytes memory, bytes memory _subData) public override returns (bool) {
        SubParams memory triggerSubData = parseSubInputs(_subData);

        uint256 debtInFront = getDebtInFront(triggerSubData.market, triggerSubData.troveId);

        return debtInFront < triggerSubData.debtInFrontMin;
    }

    function getDebtInFront(
        address _market,
        uint256 _trove
    ) public view returns (uint256) {
        (uint256 ethTotalDebt, uint256 ethUnbackedDebt) = _getUnbackedDebt(WETH_MARKET_ADDR);
        (uint256 wstEthTotalDebt, uint256 wstEthUnbackedDebt) = _getUnbackedDebt(WSTETH_MARKET_ADDR);
        (uint256 rEthTotalDebt, uint256 rEthUnbackedDebt) = _getUnbackedDebt(RETH_MARKET_ADDR);

        uint256 totalUnbackedDebt = ethUnbackedDebt + wstEthUnbackedDebt + rEthUnbackedDebt;
        uint256 branchDebtInFront = _getDebtInFrontForCurrentBranch(_market, _trove);

        // Equation:
        // ---------
        // totalDebtInFront * branchRedeemPercentage = branchDebtInFront
        // totalDebtInFront * (unbackedDebtOnBranch / totalUnbackedDebt) = branchDebtInFront
        // totalDebtInFront = branchDebtInFront * totalUnbackedDebt / unbackedDebtOnBranch
        // ---------
        uint256 numerator = branchDebtInFront * totalUnbackedDebt;

        if (_market == WETH_MARKET_ADDR)   return numerator / ethUnbackedDebt;
        if (_market == WSTETH_MARKET_ADDR) return numerator / wstEthUnbackedDebt;
        if (_market == RETH_MARKET_ADDR)   return numerator / rEthUnbackedDebt;

        revert InvalidMarketAddress();
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
    /// @notice Gets the unbacked debt for a branch
    function _getUnbackedDebt(
        address _market
    ) internal view returns (uint256 branchDebt, uint256 unbackedBold) {
        IAddressesRegistry registry = IAddressesRegistry(_market);
        branchDebt = IBorrowerOperations(registry.borrowerOperations()).getEntireBranchDebt();
        uint256 boldDeposits = IStabilityPool(registry.stabilityPool()).getTotalBoldDeposits();

        unbackedBold = branchDebt > boldDeposits ? branchDebt - boldDeposits : 0;
    }

    /// @notice Gets the debt in front for a current trove branch
    function _getDebtInFrontForCurrentBranch(
        address _market,
        uint256 _troveId
    ) public view returns (uint256 debt) {
        ITroveManager troveManager = ITroveManager(IAddressesRegistry(_market).troveManager());
        ISortedTroves sortedTroves = ISortedTroves(IAddressesRegistry(_market).sortedTroves());

        uint256 next = _troveId;
        for (uint256 i = 0; i < MAX_ITERATIONS; ++i) {
            next = sortedTroves.getNext(next);
            if (next == 0) return debt;
            debt += _getTroveDebt(troveManager, next);
        }
    }

    /// @notice Gets the latest total debt of a trove
    function _getTroveDebt(
        ITroveManager _troveManager,
        uint256 _troveId
    ) internal view returns (uint256 debt) {
        ITroveManager.LatestTroveData memory latestTroveData = _troveManager.getLatestTroveData(_troveId);
        debt = latestTroveData.entireDebt;
    }
}
