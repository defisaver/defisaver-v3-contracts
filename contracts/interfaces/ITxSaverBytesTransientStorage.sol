// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

interface ITxSaverBytesTransientStorage {
    function isPositionFeeDataStored() external view returns (bool);
    function getBytesTransiently() external view returns (bytes memory result);
}