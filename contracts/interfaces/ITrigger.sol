// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;
pragma abicoder v2;
abstract contract ITrigger {
    function isTriggered(bytes[] memory, bytes[] memory) public virtual returns (bool);
}
