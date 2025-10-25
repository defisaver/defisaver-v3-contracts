// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

abstract contract IDssSpell {
    function cast() public virtual;
    function done() public view virtual returns (bool);
    function nextCastTime() public view virtual returns (uint256);
}
