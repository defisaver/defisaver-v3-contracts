// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;

abstract contract YearnRegistry {
    function latestVault(address) external virtual view returns (address);
}