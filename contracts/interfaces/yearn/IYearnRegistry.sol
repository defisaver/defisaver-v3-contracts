// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;

abstract contract IYearnRegistry {
    function latestVault(address) external virtual view returns (address);
}