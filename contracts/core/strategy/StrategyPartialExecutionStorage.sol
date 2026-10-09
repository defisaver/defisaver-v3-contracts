// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IDFSRegistry } from "../../interfaces/core/IDFSRegistry.sol";
import { ISubStorage } from "../../interfaces/core/ISubStorage.sol";
import {
    IStrategyPartialExecutionStorage
} from "../../interfaces/core/IStrategyPartialExecutionStorage.sol";
import { DFSIds } from "../../utils/DFSIds.sol";
import { StrategyModel } from "../../core/strategy/StrategyModel.sol";
import { CoreHelper } from "../../core/helpers/CoreHelper.sol";
import { AdminAuth } from "../../auth/AdminAuth.sol";

/// @title StrategyPartialExecutionStorage
/// @notice This contract tracks the state of subscriptions that are in partial execution.
/// @dev Partial execution is used when backend can not execute strategy in one transaction (e.g. because of high TSI)
/// @dev Only StrategyExecutor can approve the start of execution.
/// @dev Only the sub owner can start execution; the initial strategy ID is preserved until the execution ends.
/// @dev Only sub owner or admin vault owner can end execution.
contract StrategyPartialExecutionStorage is
    IStrategyPartialExecutionStorage,
    CoreHelper,
    AdminAuth
{
    bytes32 private constant START_APPROVAL_SLOT = keccak256("START_APPROVAL_SLOT");

    struct ExecutionState {
        address wallet;
        uint256 initialStrategyId;
    }

    /// @notice Mapping to track the partial execution state for each subscription ID.
    mapping(uint256 => ExecutionState) private partialExecutions;

    /// @notice Approves the start of execution for a given subscription ID.
    /// @dev Only the StrategyExecutor can call this function to approve execution.
    /// @param _subId Subscription ID for which execution is being approved.
    function approveStartOfExecution(uint256 _subId) external {
        address strategyExecutor = IDFSRegistry(REGISTRY_ADDR).getAddr(DFSIds.STRATEGY_EXECUTOR);

        if (msg.sender != strategyExecutor) {
            revert NotStrategyExecutor(msg.sender, strategyExecutor);
        }

        bytes32 slot = keccak256(abi.encode(START_APPROVAL_SLOT, _subId));
        assembly {
            tstore(slot, true)
        }
    }

    /// @notice Revokes the approval to start execution for a given subscription ID.
    /// @dev Called by the sub's wallet (via RecipeExecutor) before the recipe's actions run, so no action
    ///      can use the approval granted by StrategyExecutor to start the partial execution.
    /// @dev Reverts if the approval was not granted in this transaction or the caller is not the sub owner.
    /// @param _subId Subscription ID for which the approval is being revoked.
    function clearStartApproval(uint256 _subId) external {
        if (!_isApprovedToStartExecution(_subId)) {
            revert NotApproved(_subId, msg.sender);
        }

        StrategyModel.StoredSubData memory subData = ISubStorage(SUB_STORAGE_ADDR).getSub(_subId);

        if (address(subData.walletAddr) != msg.sender) {
            revert NotSubOwner(_subId, msg.sender);
        }

        bytes32 slot = keccak256(abi.encode(START_APPROVAL_SLOT, _subId));
        assembly {
            tstore(slot, false)
        }
    }

    /// @notice Only the sub owner can start execution; the initial strategy ID is preserved until the execution ends.
    /// @dev Records the first strategy without restricting which strategy a continuation can execute.
    /// @param _subId Subscription entering partial execution.
    /// @param _strategyId Resolved StrategyStorage ID of the first partial execution.
    function startExecution(uint256 _subId, uint256 _strategyId) external {
        if (isInPartialExecution(_subId)) return;

        if (!_isApprovedToStartExecution(_subId)) {
            revert NotApproved(_subId, msg.sender);
        }

        StrategyModel.StoredSubData memory subData = ISubStorage(SUB_STORAGE_ADDR).getSub(_subId);
        if (address(subData.walletAddr) != msg.sender) {
            revert NotSubOwner(_subId, msg.sender);
        }

        partialExecutions[_subId] =
            ExecutionState({ wallet: msg.sender, initialStrategyId: _strategyId });
        emit ExecutionStarted(_subId, msg.sender);
    }

    /// @notice Only sub owner or admin vault owner can end execution
    /// @param _subId Subscription to end the partial execution for.
    function endExecution(uint256 _subId) external {
        if (!isInPartialExecution(_subId)) return;

        StrategyModel.StoredSubData memory subData = ISubStorage(SUB_STORAGE_ADDR).getSub(_subId);
        if (address(subData.walletAddr) != msg.sender && msg.sender != adminVault.owner()) {
            revert NotAuthorized(_subId, msg.sender);
        }

        delete partialExecutions[_subId];
        emit ExecutionEnded(_subId, address(subData.walletAddr), msg.sender);
    }

    /// @notice Returns the active wallet and the strategy ID selected by the first partial execution.
    /// @dev A zero wallet means inactive; strategy ID zero is valid for an active execution.
    ///      RecipeExecutor records the resolved strategy ID for both bundled and standalone strategies.
    /// @param _subId Subscription whose partial execution metadata is requested.
    /// @return wallet Active partial execution wallet, or zero when inactive.
    /// @return initialStrategyId StrategyStorage ID recorded when execution started.
    function getPartialExecution(uint256 _subId)
        external
        view
        returns (address wallet, uint256 initialStrategyId)
    {
        ExecutionState memory partialExecution = partialExecutions[_subId];
        return (partialExecution.wallet, partialExecution.initialStrategyId);
    }

    /// @dev Returns the sub.walletAddr if subscription is in partial execution.
    /// @dev A zero wallet means the subscription is not in partial execution.
    /// @param _subId Subscription ID to check.
    function getPartialExecutionWallet(uint256 _subId) public view returns (address) {
        return partialExecutions[_subId].wallet;
    }

    /// @notice Checks if a subscription is currently in partial execution.
    /// @param _subId Subscription ID to check.
    /// @return Returns true if the subscription is in partial execution, false otherwise.
    function isInPartialExecution(uint256 _subId) public view returns (bool) {
        return getPartialExecutionWallet(_subId) != address(0);
    }

    /// @notice Checks if the caller is approved to start execution for a given subId
    /// @dev Approval can only be granted by StrategyExecutor.
    /// @param _subId Subscription ID to check approval for.
    /// @return approved True if the caller is approved to start execution, false otherwise.
    function _isApprovedToStartExecution(uint256 _subId) internal view returns (bool approved) {
        bytes32 slot = keccak256(abi.encode(START_APPROVAL_SLOT, _subId));
        assembly {
            approved := tload(slot)
        }
    }
}
