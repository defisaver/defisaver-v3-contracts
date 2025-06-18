// SPDX-License-Identifier: MIT

pragma solidity =0.8.27;

abstract contract IYearnRegistry {
    function latestVault(address) external virtual view returns (address);
    function numVaults(address) external virtual view returns (uint256);
    function vaults(address,uint256) external virtual view returns (address);
}