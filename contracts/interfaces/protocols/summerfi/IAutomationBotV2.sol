// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

interface IAutomationBotV2 {
    function removeTriggers(
        uint256[] memory triggerIds,
        bytes[] memory triggerData,
        bool removeAllowance
    ) external;
}
