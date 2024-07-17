// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

abstract contract IPipInterface {
    function read() public virtual returns (bytes32);
    function poke() external virtual;
}
