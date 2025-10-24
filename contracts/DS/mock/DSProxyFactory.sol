// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

/// @title DSProxyFactory
/// @notice Mock implementation without real build functionality.
/// @dev This contract is used as a placeholder for chains without DSProxy support.
contract DSProxyFactory {
    /// @dev Will always return false.
    mapping(address => bool) public isProxy;

    function build() public returns (address proxy) {
        revert();
    }

    function build(address owner) public returns (address proxy) {
        revert();
    }
}
