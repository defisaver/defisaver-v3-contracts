// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

/// @title Used to store exchange data in a transaction
/// @dev Always set and read data in the same tx, and keep in mind it can be accessed by anyone
contract BytesTransientStorageL2 {
    bytes data;

    function setBytesTransiently(bytes calldata _data) public {
        data = _data;
    }

    function getBytesTransiently() public view returns (bytes memory){
        return data;
    }
}
