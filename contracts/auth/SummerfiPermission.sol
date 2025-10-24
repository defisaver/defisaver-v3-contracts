// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IAccountImplementation } from "../interfaces/summerfi/IAccountImplementation.sol";
import { IAccountGuard } from "../interfaces/summerfi/IAccountGuard.sol";

/// @title Contract to give execute permission to Summerfi accounts
/// @dev Called from the context of the Summerfi account
contract SummerfiPermission {
    /// @notice Gives permission to an address to call the Summerfi account
    /// @param _caller Address to give permission to
    function giveSummerfiPermission(address _caller) public {
        address guard = IAccountImplementation(address(this)).guard();
        IAccountGuard(guard).permit(_caller, address(this), true);
    }

    /// @notice Removes permission from an address to call the Summerfi account
    /// @param _caller Address to remove permission from
    function removeSummerfiPermission(address _caller) public {
        address guard = IAccountImplementation(address(this)).guard();
        IAccountGuard(guard).permit(_caller, address(this), false);
    }
}
