// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

interface IStrategyPartialExecutionStorage {
    function incrementExecutionCount(uint256 _subId, address _walletAddr, bytes32 _subHash)
        external
        returns (uint256 executionCount);

    function clearExecutionCount(uint256 _subId, address _walletAddr, bytes32 _subHash) external;

    function getStrategyMaxExecutions(uint256 _strategyId) external view returns (uint8);

    function getExecutionCount(uint256 _subId, address _walletAddr, bytes32 _subHash)
        external
        view
        returns (uint256);
}
