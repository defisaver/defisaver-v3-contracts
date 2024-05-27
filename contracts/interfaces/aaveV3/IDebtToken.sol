
// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

interface IDebtToken {
    function approveDelegation(address delegatee, uint256 amount) external;
    function borrowAllowance(address fromUser, address toUser) external view returns (uint256);
    function delegationWithSig(address, address, uint256, uint256, uint8, bytes32, bytes32) external;
    function nonces(address) external view returns(uint256);
    function name() external view returns(string memory);
}