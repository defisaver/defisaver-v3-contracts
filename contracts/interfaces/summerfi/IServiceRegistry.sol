// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

interface IServiceRegistry {
    function getRegisteredService(string calldata name) external view returns (address);
}
