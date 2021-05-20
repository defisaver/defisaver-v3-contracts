// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;

abstract contract IBotRegistry {
    function botList(address) public virtual view returns (bool);
}