// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IERC20 } from "./IERC20.sol";

abstract contract IWETH {
    function allowance(address, address) public view virtual returns (uint256);

    function balanceOf(address) public view virtual returns (uint256);

    function approve(address, uint256) public virtual;

    function transfer(address, uint256) public virtual returns (bool);

    function transferFrom(address, address, uint256) public virtual returns (bool);

    function deposit() public payable virtual;

    function withdraw(uint256) public virtual;
}
