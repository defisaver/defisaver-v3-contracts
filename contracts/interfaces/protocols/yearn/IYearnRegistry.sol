// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

interface IYearnRegistry {
    function latestVault(address) external view returns (address);
    function numVaults(address) external view returns (uint256);
    function vaults(address, uint256) external view returns (address);
}
