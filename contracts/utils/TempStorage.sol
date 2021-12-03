// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

/// @title Simple mapping to store temporary variables that can't be passed on in calldata
contract TempStorage {
    mapping (string => bytes32) internal storageSlot;

    /// @notice Set new value bytes32 value
    /// @dev Is public because the value is set/get during tx execution and not reused
    /// @param _id String id to fetch the value
    /// @param _value Actual value stored
    function set(string memory _id, bytes32 _value) public {
        storageSlot[_id] = _value;
    }

    /// @notice Get the value stored by string id
    function get(string memory _id) public view returns (bytes32) {
        return storageSlot[_id];
    }
}