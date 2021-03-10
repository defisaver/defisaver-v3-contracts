// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;

abstract contract ICoinJoin {
    uint256 public decimals;

    function join(address account, uint256 wad) external virtual;

    function exit(address account, uint256 wad) external virtual;
}
