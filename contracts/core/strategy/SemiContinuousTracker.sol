// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ISubStorage } from "../../interfaces/core/ISubStorage.sol";
import { StrategyModel } from "../../core/strategy/StrategyModel.sol";
import { CoreHelper } from "../../core/helpers/CoreHelper.sol";

contract SemiContinuousTracker is CoreHelper {
    error NotSubOwner(uint256 subId, address caller);

    event ExecutionStarted(uint256 indexed subId, address indexed wallet);
    event ExecutionFinished(uint256 indexed subId, address indexed wallet);

    mapping(uint256 => address) public executionWalletOf;

    function startExecution(uint256 _subId) external {
        if (isInExecution(_subId)) return;

        StrategyModel.StoredSubData memory subData = ISubStorage(SUB_STORAGE_ADDR).getSub(_subId);

        // TODO -> Do we want to have admin option to start/finish execution?
        if (subData.walletAddr != bytes20(msg.sender)) {
            revert NotSubOwner(_subId, msg.sender);
        }

        executionWalletOf[_subId] = msg.sender;
        emit ExecutionStarted(_subId, msg.sender);
    }

    function finishExecution(uint256 _subId) external {
        if (!isInExecution(_subId)) return;

        StrategyModel.StoredSubData memory subData = ISubStorage(SUB_STORAGE_ADDR).getSub(_subId);

        if (subData.walletAddr != bytes20(msg.sender)) {
            revert NotSubOwner(_subId, msg.sender);
        }

        delete executionWalletOf[_subId];
        emit ExecutionFinished(_subId, msg.sender);
    }

    function isInExecution(uint256 _subId) public view returns (bool) {
        return executionWalletOf[_subId] != address(0);
    }
}
