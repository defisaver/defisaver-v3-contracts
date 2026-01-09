// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

interface IAutomationBot {
    function serviceRegistry() external returns (address);
    function removeApproval(address _serviceRegistry, uint256 cdpId) external;
}

