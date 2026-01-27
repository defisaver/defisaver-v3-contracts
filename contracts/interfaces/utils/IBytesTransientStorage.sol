// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

interface IBytesTransientStorage {
    function setBytesTransiently(bytes calldata) external;
    function getBytesTransiently() external view returns (bytes memory);
}
