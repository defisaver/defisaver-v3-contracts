// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

abstract contract IBotRegistry {
    function botList(address) public virtual view returns (bool);
}