// SPDX-License-Identifier: MIT

pragma solidity =0.8.27;

abstract contract IPipInterface {
    function read() public virtual returns (bytes32);
    function poke() external virtual;
}
