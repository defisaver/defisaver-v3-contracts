// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

interface IQiDaoRegistry {
    function vaultAddressById(uint16) external view returns (address);
}