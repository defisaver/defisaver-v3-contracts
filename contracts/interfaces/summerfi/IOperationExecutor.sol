// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

struct Call {
    bytes32 target;
    bytes data;
    bool skip;
}
interface IOperationExecutor {
    function executeOp(Call[] calldata, string calldata) external payable;
}