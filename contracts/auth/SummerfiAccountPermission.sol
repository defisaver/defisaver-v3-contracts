// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import {
    IAccountImplementation
} from "../interfaces/protocols/summerfi/IAccountImplementation.sol";
import { IAccountGuard } from "../interfaces/protocols/summerfi/IAccountGuard.sol";

/// @title Contract to give execute permission to Summerfi accounts
/// @dev Called from the context of the Summerfi account
contract SummerfiAccountPermission {
    /// @notice Gives permission to an address to call the Summerfi account
    /// @param _caller Address to give permission to
    function _giveSummerfiAccountPermission(address _caller) internal {
        // TODO -> Hardcode this addr?
        address guard = IAccountImplementation(address(this)).guard();
        IAccountGuard(guard).permit(_caller, address(this), true);
    }

    /// @notice Removes permission from an address to call the Summerfi account
    /// @param _caller Address to remove permission from
    function _removeSummerfiAccountPermission(address _caller) internal {
        // TODO -> Hardcode this addr?
        address guard = IAccountImplementation(address(this)).guard();
        IAccountGuard(guard).permit(_caller, address(this), false);
    }
}

