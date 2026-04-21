// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

interface IAutomationBot {
    function removeTrigger(uint256 cdpId, uint256 triggerId, bool removeAllowance) external;
}

