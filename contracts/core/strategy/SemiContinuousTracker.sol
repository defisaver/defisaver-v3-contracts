// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ISubStorage } from "../../interfaces/core/ISubStorage.sol";
import { StrategyModel } from "../../core/strategy/StrategyModel.sol";
import { CoreHelper } from "../../core/helpers/CoreHelper.sol";
import { AdminAuth } from "../../auth/AdminAuth.sol";

contract SemiContinuousTracker is CoreHelper, AdminAuth {
    /// @notice only sub owner can start execution
    error NotSubOwner(uint256 subId, address caller);

    /// @notice only sub owner or admin can finish execution
    error NotAuthorized(uint256 subId, address caller);

    event ExecutionStarted(uint256 indexed subId, address indexed wallet);
    event ExecutionFinished(
        uint256 indexed subId, address indexed subOwner, address indexed initiator
    );

    mapping(uint256 => address) public executionWalletOf;

    /// @notice only sub owner can start execution
    function startExecution(uint256 _subId) external {
        if (isInExecution(_subId)) return;

        StrategyModel.StoredSubData memory subData = ISubStorage(SUB_STORAGE_ADDR).getSub(_subId);
        if (address(subData.walletAddr) != msg.sender) {
            revert NotSubOwner(_subId, msg.sender);
        }

        executionWalletOf[_subId] = msg.sender;
        emit ExecutionStarted(_subId, msg.sender);
    }

    /// @notice only sub owner or admin can finish execution
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
}
