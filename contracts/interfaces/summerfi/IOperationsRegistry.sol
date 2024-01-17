// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

interface IOperationsRegistry {
    function getOperation(
        string memory name
    ) external view returns (bytes32[] memory actions, bool[] memory optional);
}