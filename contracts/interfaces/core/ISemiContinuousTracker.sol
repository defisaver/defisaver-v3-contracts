// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

interface ISemiContinuousTracker {
    error NotSubOwner(uint256 subId, address caller);

    function approveStartOfExecution(uint256 _subId) external;
    function startExecution(uint256 _subId, uint256 _strategyId) external;
    function finishExecution(uint256 _subId) external;
    function executionWalletOf(uint256 _subId) external view returns (address);
    /// @notice Returns the active wallet and initial StrategyStorage ID, without pinning later executions.
    function getExecution(uint256 _subId)
        external
        view
        returns (address wallet, uint256 initialStrategyId);
    function isInExecution(uint256 _subId) external view returns (bool);
}
