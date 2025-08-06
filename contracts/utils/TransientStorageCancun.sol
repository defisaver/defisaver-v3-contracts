// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

/// @title Transient per-tx key-value store
/// @notice Uses Solidity 0.8.24 tstore/tload to store bytes32 values transiently
/// @dev Use only within a single transaction; values are gone after the tx
contract TransientStorageCancun {
    /// @notice Stores a bytes32 value under a given string key
    /// @dev Uses keccak256(_key) as the transient storage slot
    function setBytes32(string memory _key, bytes32 _value) public {
        bytes32 slot = keccak256(abi.encode(_key));
        assembly {
            tstore(slot, _value)
        }
    }

    /// @notice Reads a bytes32 value previously stored with the given key
    /// @dev Only valid in the same tx that `setBytes32` was called
    function getBytes32(string memory _key) public view returns (bytes32 value) {
        bytes32 slot = keccak256(abi.encode(_key));
        assembly {
            value := tload(slot)
        }
    }
}
