// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { IWrapperExchangeRegistry } from "../../interfaces/exchange/IWrapperExchangeRegistry.sol";
import { AdminAuth } from "../../auth/AdminAuth.sol";

/// @title WrapperExchangeRegistry
/// @notice Owner-managed allowlist of onchain and offchain exchange wrappers.
contract WrapperExchangeRegistry is AdminAuth, IWrapperExchangeRegistry {
    /// @notice A wrapper cannot be added at the zero address.
    error EmptyAddrError();

    /// @notice Emitted on every successful add, including already allowed wrappers.
    event WrapperAdded(address indexed wrapper);
    /// @notice Emitted on every successful removal, including wrappers not currently allowed.
    event WrapperRemoved(address indexed wrapper);

    mapping(address => bool) private wrappers;

    /// @notice Allows a nonzero wrapper address. Only callable by the owner.
    function addWrapper(address _wrapper) external onlyOwner {
        if (_wrapper == address(0)) {
            revert EmptyAddrError();
        }

        wrappers[_wrapper] = true;
        emit WrapperAdded(_wrapper);
    }

    /// @notice Revokes a wrapper's permission. Only callable by the owner.
    function removeWrapper(address _wrapper) external onlyOwner {
        wrappers[_wrapper] = false;
        emit WrapperRemoved(_wrapper);
    }

    /// @notice Returns whether the wrapper is currently allowed.
    function isWrapper(address _wrapper) external view returns (bool) {
        return wrappers[_wrapper];
    }
}
