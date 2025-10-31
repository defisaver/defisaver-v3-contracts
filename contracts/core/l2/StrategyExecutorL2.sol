// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ISubStorageL2 } from "../../interfaces/core/ISubStorageL2.sol";
import { StrategyExecutorCommon } from "../strategy/StrategyExecutorCommon.sol";

/// @title Main entry point for executing automated strategies
contract StrategyExecutorL2 is StrategyExecutorCommon {
    /// @notice Checks all the triggers and executes actions
    /// @dev Only authorized callers can execute it
    /// @param _subId Id of the subscription
    /// @param _strategyIndex Which strategy in a bundle, need to specify because when sub is part of a bundle
    /// @param _triggerCallData All input data needed to execute triggers
    /// @param _actionsCallData All input data needed to execute actions
    function executeStrategy(
        uint256 _subId,
        uint256 _strategyIndex,
        bytes[] calldata _triggerCallData,
        bytes[] calldata _actionsCallData
    ) external {
        // check bot auth
        if (!_checkCallerAuth(_subId)) {
            revert BotNotApproved(msg.sender, _subId);
        }

        StoredSubData memory storedSubData = ISubStorageL2(SUB_STORAGE_ADDR).getSub(_subId);
        StrategySub memory _sub = ISubStorageL2(SUB_STORAGE_ADDR).getStrategySub(_subId);

        // subscription must be enabled
        if (!storedSubData.isEnabled) {
            revert SubNotEnabled(_subId);
        }

        // execute actions
        _callActions(
            _subId,
            _actionsCallData,
            _triggerCallData,
            _strategyIndex,
            _sub,
            address(storedSubData.walletAddr)
        );
    }
}
