// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

abstract contract IYearnRegistry {
    function latestVault(address) external view virtual returns (address);
    function numVaults(address) external view virtual returns (uint256);
    function vaults(address, uint256) external view virtual returns (address);
}
