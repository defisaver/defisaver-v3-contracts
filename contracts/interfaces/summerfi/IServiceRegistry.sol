// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

interface IServiceRegistry {
    function getRegisteredService(string calldata name) external view returns (address);
}
