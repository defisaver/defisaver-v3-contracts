// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IDFSRegistry } from "../../interfaces/core/IDFSRegistry.sol";
import { ISubStorage } from "../../interfaces/core/ISubStorage.sol";
import { DFSIds } from "../../utils/DFSIds.sol";
import { StrategyModel } from "../../core/strategy/StrategyModel.sol";
import { CoreHelper } from "../../core/helpers/CoreHelper.sol";
import { AdminAuth } from "../../auth/AdminAuth.sol";

contract SemiContinuousTracker is CoreHelper, AdminAuth {
    /// @notice only sub owner can start execution
    error NotSubOwner(uint256 subId, address caller);

    /// @notice only sub owner or admin can finish execution
    error NotAuthorized(uint256 subId, address caller);

    /// @notice only strategy executor can approve sub to start execution
    error NotStrategyExecutor(address caller, address strategyExecutor);

    /// @notice only approved sub can start execution
    error NotApproved(uint256 subId, address caller);

    event ExecutionStarted(uint256 indexed subId, address indexed wallet);
    event ExecutionFinished(
        uint256 indexed subId, address indexed subOwner, address indexed initiator
    );

    bytes32 private constant START_APPROVAL_SLOT = keccak256("START_APPROVAL_SLOT");

    mapping(uint256 => address) public executionWalletOf;

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

    /// @notice only sub owner can start execution
    function startExecution(uint256 _subId) external {
        if (isInExecution(_subId)) return;

        if (!isApprovedToStartExecution(_subId)) {
            revert NotApproved(_subId, msg.sender);
        }

        StrategyModel.StoredSubData memory subData = ISubStorage(SUB_STORAGE_ADDR).getSub(_subId);
        if (address(subData.walletAddr) != msg.sender) {
            revert NotSubOwner(_subId, msg.sender);
        }

        executionWalletOf[_subId] = msg.sender;
        emit ExecutionStarted(_subId, msg.sender);
    }

    /// @notice only sub owner or admin vault owner can finish execution
    function finishExecution(uint256 _subId) external {
        if (!isInExecution(_subId)) return;

        StrategyModel.StoredSubData memory subData = ISubStorage(SUB_STORAGE_ADDR).getSub(_subId);
        if (address(subData.walletAddr) != msg.sender && msg.sender != adminVault.owner()) {
            revert NotAuthorized(_subId, msg.sender);
        }

        delete executionWalletOf[_subId];
        emit ExecutionFinished(_subId, address(subData.walletAddr), msg.sender);
    }

    function isInExecution(uint256 _subId) public view returns (bool) {
        return executionWalletOf[_subId] != address(0);
    }

    function isApprovedToStartExecution(uint256 _subId) internal view returns (bool approved) {
        bytes32 slot = keccak256(abi.encode(START_APPROVAL_SLOT, _subId));
        assembly {
            approved := tload(slot)
        }
    }
}
