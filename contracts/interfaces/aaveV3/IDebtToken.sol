
// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

interface IDebtToken {
    function approveDelegation(address delegatee, uint256 amount) external;
    function borrowAllowance(address fromUser, address toUser) external view returns (uint256);
}