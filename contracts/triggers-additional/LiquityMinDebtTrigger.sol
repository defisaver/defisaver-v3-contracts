// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { ITrigger } from "../interfaces/core/ITrigger.sol";
import { AdminAuth } from "../auth/AdminAuth.sol";
import { LiquityHelper } from "../actions/liquity/helpers/LiquityHelper.sol";

/// @title Liquity V1 minimum-debt trigger
/// @notice Filters empty or undersized Liquity V1 troves before automation execution.
/// @dev Mainnet only. Uses stored debt including gas compensation, valuing LUSD at par.
contract LiquityMinDebtTrigger is ITrigger, AdminAuth, LiquityHelper {
    /// @param user Owner of the Liquity V1 trove.
    /// @param minDebt Minimum debt in whole USD (e.g. 5000), with LUSD valued at par.
    struct CalldataParams {
        address user;
        uint256 minDebt; // Whole USD, matching the backend's LUSD-at-par debt threshold.
    }

    /// @notice Returns true only for nonzero debt at or above the supplied minimum.
    /// @param _calldata ABI-encoded CalldataParams; subscription data is unused.
    /// @return Whether the trove meets the minimum-debt condition.
    function isTriggered(bytes memory _calldata, bytes memory)
        external
        view
        override
        returns (bool)
    {
        CalldataParams memory params = abi.decode(_calldata, (CalldataParams));
        // Match LiquityView.getTroveInfo, used by automation, including gas compensation.
        uint256 debt = TroveManager.getTroveDebt(params.user);
        return debt != 0 && debt >= params.minDebt * 1e18;
    }

    function changedSubData(bytes memory) public pure override returns (bytes memory) { }

    function isChangeable() public pure override returns (bool) {
        return false;
    }
}
