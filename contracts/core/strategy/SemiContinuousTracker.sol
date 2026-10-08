// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IDFSRegistry } from "../../interfaces/core/IDFSRegistry.sol";
import { ISubStorage } from "../../interfaces/core/ISubStorage.sol";
import { ISemiContinuousTracker } from "../../interfaces/core/ISemiContinuousTracker.sol";
import { DFSIds } from "../../utils/DFSIds.sol";
import { StrategyModel } from "../../core/strategy/StrategyModel.sol";
import { CoreHelper } from "../../core/helpers/CoreHelper.sol";
import { AdminAuth } from "../../auth/AdminAuth.sol";

contract SemiContinuousTracker is ISemiContinuousTracker, CoreHelper, AdminAuth {
    bytes32 private constant START_APPROVAL_SLOT = keccak256("START_APPROVAL_SLOT");

    struct ExecutionState {
        address wallet;
        uint256 initialStrategyId;
    }

    mapping(uint256 => ExecutionState) private executions;

    /// @notice checks if the caller is StrategyExecutor and approves starting semi-continuous execution for a given subId
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

    /// @notice Only the sub owner can start execution; the initial strategy ID is preserved until finish.
    /// @dev Records the first strategy without restricting which strategy a continuation can execute.
    /// @param _subId Subscription entering semi-continuous execution.
    /// @param _strategyId Resolved StrategyStorage ID of the first partial execution.
    function startExecution(uint256 _subId, uint256 _strategyId) external {
        if (isInExecution(_subId)) return;

        if (!isApprovedToStartExecution(_subId)) {
            revert NotApproved(_subId, msg.sender);
        }

        StrategyModel.StoredSubData memory subData = ISubStorage(SUB_STORAGE_ADDR).getSub(_subId);
        if (address(subData.walletAddr) != msg.sender) {
            revert NotSubOwner(_subId, msg.sender);
        }

        executions[_subId] = ExecutionState({ wallet: msg.sender, initialStrategyId: _strategyId });
        emit ExecutionStarted(_subId, msg.sender);
    }

    /// @notice only sub owner or admin vault owner can finish execution
    function finishExecution(uint256 _subId) external {
        if (!isInExecution(_subId)) return;

        StrategyModel.StoredSubData memory subData = ISubStorage(SUB_STORAGE_ADDR).getSub(_subId);
        if (address(subData.walletAddr) != msg.sender && msg.sender != adminVault.owner()) {
            revert NotAuthorized(_subId, msg.sender);
        }

        delete executions[_subId];
        emit ExecutionFinished(_subId, address(subData.walletAddr), msg.sender);
    }

    /// @notice Returns the active wallet and the strategy ID selected by the first partial execution.
    /// @dev A zero wallet means inactive; strategy ID zero is valid for an active execution.
    ///      RecipeExecutor records the resolved strategy ID for both bundled and standalone strategies.
    /// @param _subId Subscription whose execution metadata is requested.
    /// @return wallet Active execution wallet, or zero when inactive.
    /// @return initialStrategyId StrategyStorage ID recorded when execution started.
    function getExecution(uint256 _subId)
        external
        view
        returns (address wallet, uint256 initialStrategyId)
    {
        ExecutionState memory execution = executions[_subId];
        return (execution.wallet, execution.initialStrategyId);
    }

    function executionWalletOf(uint256 _subId) public view returns (address) {
        return executions[_subId].wallet;
    }

    function isInExecution(uint256 _subId) public view returns (bool) {
        return executionWalletOf(_subId) != address(0);
    }

    function isApprovedToStartExecution(uint256 _subId) internal view returns (bool approved) {
        bytes32 slot = keccak256(abi.encode(START_APPROVAL_SLOT, _subId));
        assembly {
            approved := tload(slot)
        }
    }
}
