// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

interface ITxSaverBytesTransientStorage {
    function getFeeType() external view returns (uint256);
    function getBytesTransiently() external view returns (bytes memory result);
}