// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { AdminAuth } from "../auth/AdminAuth.sol";
import { ITrigger } from "../interfaces/core/ITrigger.sol";
import { ISpoke } from "../interfaces/protocols/aaveV4/ISpoke.sol";

contract AaveV4MinDebtTrigger is ITrigger, AdminAuth {
    /// @param user address of the user whose position we check
    /// @param market aaveV4 market/spoke address
    /// @param minDebt minimum debt in whole USD (no decimals, e.g. 5000 for 5000 USD) that the user must have for the trigger to return true
    struct CalldataParams {
        address user;
        address market;
        uint256 minDebt;
    }

    /// @dev totalDebtValueRay is a USD value (1e26 == 1 USD) scaled by RAY (1e27), so 1e53 == 1 USD.
    uint256 constant PRECISION = 1e53;

    function isTriggered(bytes memory _calldata, bytes memory)
        external
        view
        override
        returns (bool)
    {
        CalldataParams memory params = parseCallInputs(_calldata);

        uint256 totalDebtValueRay =
            ISpoke(params.market).getUserAccountData(params.user).totalDebtValueRay;

        return totalDebtValueRay >= params.minDebt * PRECISION;
    }

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
