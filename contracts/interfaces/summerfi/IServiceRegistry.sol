// SPDX-License-Identifier: MIT
pragma solidity =0.8.27;

interface IServiceRegistry {
    function getRegisteredService(string calldata name) external view returns (address);
    function getServiceAddress(bytes32 serviceNameHash) external view returns (address);
}
