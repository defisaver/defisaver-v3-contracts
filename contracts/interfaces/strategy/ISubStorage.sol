// SPDX-License-Identifier: MIT

pragma solidity =0.8.4;

abstract contract ISubStorage {
    function updateSubTriggerData(
        uint256 _subId,
        bytes[] memory _triggerData
    ) public virtual;
}