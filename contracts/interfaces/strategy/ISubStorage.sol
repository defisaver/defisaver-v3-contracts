// SPDX-License-Identifier: MIT

pragma solidity =0.8.4;

abstract contract ISubStorage {
    function updateSubData(
        uint256 _subId,
        bytes[] memory _triggerData,
        bytes[] memory _recipeData
    ) public virtual;
}