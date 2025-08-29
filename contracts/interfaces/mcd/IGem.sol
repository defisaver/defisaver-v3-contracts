// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

abstract contract IGem {
    function dec() public virtual returns (uint256);
    function gem() public virtual returns (IGem);
    function join(address, uint256) public payable virtual;
    function exit(address, uint256) public virtual;

    function approve(address, uint256) public virtual;
    function transfer(address, uint256) public virtual returns (bool);
    function transferFrom(address, address, uint256) public virtual returns (bool);
    function deposit() public payable virtual;
    function withdraw(uint256) public virtual;
    function allowance(address, address) public virtual returns (uint256);
}
