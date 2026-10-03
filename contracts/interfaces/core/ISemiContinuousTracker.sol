// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

interface ISemiContinuousTracker {
    error NotSubOwner(uint256 subId, address caller);

    function approveStartOfExecution(uint256 _subId) external;
    function startExecution(uint256 _subId, uint256 _strategyIndex) external;
    function finishExecution(uint256 _subId) external;
    function executionWalletOf(uint256 _subId) external view returns (address);
    function getExecution(uint256 _subId)
        external
        view
        returns (address wallet, uint256 strategyIndex);
    function isInExecution(uint256 _subId) external view returns (bool);
}
