// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ISubStorage } from "../../interfaces/core/ISubStorage.sol";
import {
    IStrategyPartialExecutionStorage
} from "../../interfaces/core/IStrategyPartialExecutionStorage.sol";
import { AdminAuth } from "../../auth/AdminAuth.sol";
import { StrategyModel } from "../../core/strategy/StrategyModel.sol";
import { CoreHelper } from "../../core/helpers/CoreHelper.sol";

/// @title StrategyPartialExecutionStorage
/// @notice Stores successful partial execution counts for non-continuous strategies.
contract StrategyPartialExecutionStorage is
    StrategyModel,
    AdminAuth,
    CoreHelper,
    IStrategyPartialExecutionStorage
{
    uint8 public constant MAX_EXECUTIONS_LIMIT = 5;

    mapping(bytes32 => uint256) public executionCounts;
    mapping(uint256 => uint8) public strategyMaxExecutions;

    error SenderNotSubWallet(
        uint256 subId, address sender, address subWallet, address suppliedWallet
    );
    error SubHashMismatch(uint256 subId, bytes32 suppliedSubHash, bytes32 storedSubHash);
    error InvalidMaxExecutions(uint8 maxExecutions);

    event StrategyMaxExecutionsSet(uint256 indexed strategyId, uint8 maxExecutions);
    event ExecutionCountIncremented(
        uint256 indexed subId,
        address indexed walletAddr,
        bytes32 indexed subHash,
        uint256 executionCount
    );
    event ExecutionCountCleared(
        uint256 indexed subId, address indexed walletAddr, bytes32 indexed subHash
    );

    /// @notice Enables/disables partial execution for a strategy.
    /// @param _strategyId Id of the strategy to set the max executions for
    /// @param _maxExecutions Maximum number of partial executions allowed for the strategy
    /// @dev maxExecutions == 0 disables partial execution for the strategy.
    /// @dev Can't set max executions higher than the limit.
    function setStrategyMaxExecutions(uint256 _strategyId, uint8 _maxExecutions)
        external
        onlyOwner
    {
        if (_maxExecutions > MAX_EXECUTIONS_LIMIT) {
            revert InvalidMaxExecutions(_maxExecutions);
        }

        strategyMaxExecutions[_strategyId] = _maxExecutions;

        emit StrategyMaxExecutionsSet(_strategyId, _maxExecutions);
    }

    /// @notice Increments partial execution count for a subscription.
    /// @dev Only the wallet that owns the subscription can update its count.
    function incrementExecutionCount(uint256 _subId, address _walletAddr, bytes32 _subHash)
        external
        override
        returns (uint256 executionCount)
    {
        _validateSubWalletAndHash(_subId, _walletAddr, _subHash);

        bytes32 key = _getKey(_subId, _walletAddr, _subHash);
        executionCount = ++executionCounts[key];

        emit ExecutionCountIncremented(_subId, _walletAddr, _subHash, executionCount);
    }

    /// @notice Clears partial execution count for a subscription.
    /// @dev Used once the subscription is finalized/deactivated.
    /// @dev Only the wallet that owns the subscription can clear its count.
    function clearExecutionCount(uint256 _subId, address _walletAddr, bytes32 _subHash)
        external
        override
    {
        _validateSubWalletAndHash(_subId, _walletAddr, _subHash);

        bytes32 key = _getKey(_subId, _walletAddr, _subHash);

        if (executionCounts[key] != 0) {
            delete executionCounts[key];
            emit ExecutionCountCleared(_subId, _walletAddr, _subHash);
        }
    }

    /// @notice Gets the maximum number of partial executions allowed for a strategy.
    /// @param _strategyId Id of the strategy to get the max executions for
    /// @return The maximum number of partial executions allowed for the strategy
    function getStrategyMaxExecutions(uint256 _strategyId) external view override returns (uint8) {
        return strategyMaxExecutions[_strategyId];
    }

    /// @notice Gets the execution count for a subscription.
    /// @param _subId Id of the subscription to get the execution count for
    /// @param _walletAddr Address of the wallet that owns the subscription
    /// @param _subHash Hash of the subscription
    /// @return The execution count for the subscription
    function getExecutionCount(uint256 _subId, address _walletAddr, bytes32 _subHash)
        external
        view
        override
        returns (uint256)
    {
        return executionCounts[_getKey(_subId, _walletAddr, _subHash)];
    }

    /*//////////////////////////////////////////////////////////////
                            INTERNAL
    //////////////////////////////////////////////////////////////*/
    /// @notice Validates that the sender is the wallet that owns the subscription and the hash matches.
    function _validateSubWalletAndHash(uint256 _subId, address _walletAddr, bytes32 _subHash)
        internal
        view
    {
        StoredSubData memory storedSubData = ISubStorage(SUB_STORAGE_ADDR).getSub(_subId);
        address subWallet = address(storedSubData.walletAddr);

        if (msg.sender != subWallet || _walletAddr != subWallet) {
            revert SenderNotSubWallet(_subId, msg.sender, subWallet, _walletAddr);
        }

        if (_subHash != storedSubData.strategySubHash) {
            revert SubHashMismatch(_subId, _subHash, storedSubData.strategySubHash);
        }
    }

    /// @notice Gets the key for the execution count.
    /// @param _subId Id of the subscription to get the execution count for
    /// @param _walletAddr Address of the wallet that owns the subscription
    /// @param _subHash Hash of the subscription
    /// @return The key for the execution count
    function _getKey(uint256 _subId, address _walletAddr, bytes32 _subHash)
        internal
        pure
        returns (bytes32)
    {
        return keccak256(abi.encode(_subId, _walletAddr, _subHash));
    }
}
