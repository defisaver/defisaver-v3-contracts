// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;

abstract contract ITrigger {
    function isTriggered(bytes memory, bytes memory) virtual public returns (bool);
}
