// SPDX-License-Identifier: MIT

pragma solidity =0.8.4;

abstract contract IPipInterface {
    function read() public virtual returns (bytes32);
}
