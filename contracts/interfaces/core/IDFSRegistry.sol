// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

interface IDFSRegistry {
    function getAddr(bytes4 _id) external view returns (address);
}