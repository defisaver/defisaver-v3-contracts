// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

interface IOperationsRegistry {
    function getOperation(
        string memory name
    ) external view returns (bytes32[] memory actions, bool[] memory optional);
}