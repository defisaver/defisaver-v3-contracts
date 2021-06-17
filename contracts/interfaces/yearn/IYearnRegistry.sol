// SPDX-License-Identifier: MIT

pragma solidity =0.8.4;

abstract contract IYearnRegistry {
    function latestVault(address) external virtual view returns (address);
}