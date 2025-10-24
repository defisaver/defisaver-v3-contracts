// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

abstract contract ISubStorage {
    function updateSubTriggerData(uint256 _subId, bytes memory _triggerData, uint256 _triggerNum) public virtual;
}
