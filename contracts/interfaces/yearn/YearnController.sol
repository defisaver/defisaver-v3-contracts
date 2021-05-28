// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;

abstract contract YearnController {
    function vaults(address) external virtual view returns (address);
}