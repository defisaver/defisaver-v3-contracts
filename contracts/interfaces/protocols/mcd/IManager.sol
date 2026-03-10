// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

abstract contract IManager {
    function last(address) public virtual returns (uint256);
    function cdpCan(address, uint256, address) public view virtual returns (uint256);
    function ilks(uint256) public view virtual returns (bytes32);
    function owns(uint256) public view virtual returns (address);
    function urns(uint256) public view virtual returns (address);
    function vat() public view virtual returns (address);
    function open(bytes32, address) public virtual returns (uint256);
    function give(uint256, address) public virtual;
    function cdpAllow(uint256, address, uint256) public virtual;
    function urnAllow(address, uint256) public virtual;
    function frob(uint256, int256, int256) public virtual;
    function flux(uint256, address, uint256) public virtual;
    function move(uint256, address, uint256) public virtual;
    function exit(address, uint256, address, uint256) public virtual;
    function quit(uint256, address) public virtual;
    function enter(address, uint256) public virtual;
    function shift(uint256, uint256) public virtual;
}
