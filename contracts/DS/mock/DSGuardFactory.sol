// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

/// @title DSGuardFactory
/// @notice Mock implementation without real newGuard functionality.
/// @dev This contract is used as a placeholder for chains without DSGuardFactory support.
contract DSGuardFactory {
    /// @dev Will always return false.
    mapping (address => bool) public isGuard;

    function newGuard() public returns (address guard) {
        revert();
    }
}