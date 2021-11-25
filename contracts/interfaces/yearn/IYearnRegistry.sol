// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

abstract contract IYearnRegistry {
    function latestVault(address) external virtual view returns (address);
}