// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

interface IAutomationBot {
    function removeApproval(address _serviceRegistry, uint256 cdpId) external;
}

