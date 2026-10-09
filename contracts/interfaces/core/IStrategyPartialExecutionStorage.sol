// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

interface IStrategyPartialExecutionStorage {
    /// @notice only sub owner can start execution
    error NotSubOwner(uint256 subId, address caller);

    /// @notice only sub owner or admin can end execution
    error NotAuthorized(uint256 subId, address caller);

    /// @notice only strategy executor can approve sub to start execution
    error NotStrategyExecutor(address caller, address strategyExecutor);

    /// @notice only approved sub can start execution
    error NotApproved(uint256 subId, address caller);

    event ExecutionStarted(uint256 indexed subId, address indexed wallet);
    event ExecutionEnded(
        uint256 indexed subId, address indexed subOwner, address indexed initiator
    );

    function approveStartOfExecution(uint256 _subId) external;
    function clearStartApproval(uint256 _subId) external;
    function startExecution(uint256 _subId, uint256 _strategyId) external;
    function endExecution(uint256 _subId) external;
    function getPartialExecution(uint256 _subId)
        external
        view
        returns (address wallet, uint256 initialStrategyId);
    function getPartialExecutionWallet(uint256 _subId) external view returns (address);
    function isInPartialExecution(uint256 _subId) external view returns (bool);
}
