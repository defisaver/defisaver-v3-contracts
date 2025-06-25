// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

interface IExecutable {
    function execute(bytes calldata data, uint8[] memory paramsMap) external payable;
}