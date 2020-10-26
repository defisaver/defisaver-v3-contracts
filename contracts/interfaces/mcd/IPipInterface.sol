// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;

abstract contract IPipInterface {
    function read() public virtual returns (bytes32);
}
