// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IGem } from "./IGem.sol";

abstract contract IJoin {
    bytes32 public ilk;

    function dec() public view virtual returns (uint256);
    function gem() public view virtual returns (IGem);
    function join(address, uint256) public payable virtual;
    function exit(address, uint256) public virtual;
}
