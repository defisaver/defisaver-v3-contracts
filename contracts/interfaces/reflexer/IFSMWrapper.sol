// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

interface IFSMWrapper {
    function getNextResultWithValidity() external view returns (uint256 price, bool valid);
}