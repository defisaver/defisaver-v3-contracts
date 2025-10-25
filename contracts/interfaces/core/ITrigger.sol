// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

abstract contract ITrigger {
    function isTriggered(bytes memory, bytes memory) public virtual returns (bool);
    function isChangeable() public virtual returns (bool);
    function changedSubData(bytes memory) public virtual returns (bytes memory);
}
