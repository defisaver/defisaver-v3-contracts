// SPDX-License-Identifier: MIT

pragma solidity =0.8.4;

abstract contract IBotRegistry {
    function botList(address) public virtual view returns (bool);
}