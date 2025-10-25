// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

abstract contract IBotRegistry {
    function botList(address) public view virtual returns (bool);
}
