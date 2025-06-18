// SPDX-License-Identifier: MIT

pragma solidity =0.8.27;

import { IGem } from "./IGem.sol";

abstract contract IJoin {
    bytes32 public ilk;

    function dec() virtual public view returns (uint);
    function gem() virtual public view returns (IGem);
    function join(address, uint) virtual public payable;
    function exit(address, uint) virtual public;
}
