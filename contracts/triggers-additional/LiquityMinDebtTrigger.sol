// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { ITrigger } from "../interfaces/core/ITrigger.sol";
import { AdminAuth } from "../auth/AdminAuth.sol";
import { LiquityHelper } from "../actions/liquity/helpers/LiquityHelper.sol";

contract LiquityMinDebtTrigger is ITrigger, AdminAuth, LiquityHelper {
    /// @param user Owner of the Liquity V1 trove.
    /// @param minDebt minimum debt in whole USD (no decimals, e.g. 5000 for 5000 USD) that the user must have for the trigger to return true
    struct CalldataParams {
        address user;
        uint256 minDebt;
    }

    /// @dev Liquity debt is always denominated in LUSD, which has 18 decimals. We assume 1 LUSD == 1 USD.
    uint256 constant PRECISION = 1e18;

    function isTriggered(bytes memory _calldata, bytes memory)
        external
        view
        override
        returns (bool)
    {
        CalldataParams memory params = parseCallInputs(_calldata);

        uint256 debt = TroveManager.getTroveDebt(params.user);

        return debt >= params.minDebt * PRECISION;
    }

    //solhint-disable-next-line no-empty-blocks
    function changedSubData(bytes memory _subData) public pure override returns (bytes memory) { }

    function isChangeable() public pure override returns (bool) {
        return false;
    }

    function parseCallInputs(bytes memory _callData)
        public
        pure
        returns (CalldataParams memory params)
    {
        params = abi.decode(_callData, (CalldataParams));
    }
}
