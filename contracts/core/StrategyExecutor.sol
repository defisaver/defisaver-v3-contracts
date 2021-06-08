// SPDX-License-Identifier: MIT

pragma solidity =0.8.4;

import "../auth/AdminAuth.sol";
import "../interfaces/ITrigger.sol";
import "../interfaces/IDSProxy.sol";
import "./StrategyData.sol";
import "./Subscriptions.sol";
import "./BotAuth.sol";
import "./DFSRegistry.sol";
import "./ProxyAuth.sol";

/// @title Main entry point for executing automated strategies
contract StrategyExecutor is StrategyData, AdminAuth {

    address public constant PROXY_AUTH_ADDR = 0x3Aa5ebB10DC797CAC828524e59A333d0A371443c;

    address public constant REGISTRY_ADDR = 0xD6049E1F5F3EfF1F921f5532aF1A1632bA23929C;
    DFSRegistry public constant registry = DFSRegistry(REGISTRY_ADDR);

    bytes32 constant BOT_AUTH_ID = keccak256("BotAuth");
    bytes32 constant SUBSCRIPTION_ID = keccak256("Subscriptions");
    bytes32 constant TASK_MANAGER_ID = keccak256("TaskExecutor");

    error TriggerNotActiveError();
    error BotNotApprovedError();
    error StrategyNotActiveError();

    /// @notice Checks all the triggers and executes actions
    /// @dev Only authorized callers can execute it
    /// @param _strategyId Id of the strategy
    /// @param _triggerCallData All input data needed to execute triggers
    /// @param _actionsCallData All input data needed to execute actions
    function executeStrategy(
        uint256 _strategyId,
        bytes[][] memory _triggerCallData,
        bytes[][] memory _actionsCallData
    ) public   {
        Subscriptions sub = Subscriptions(registry.getAddr(SUBSCRIPTION_ID));

        Strategy memory strategy = sub.getStrategy(_strategyId);
        if (!(strategy.active)){
            revert StrategyNotActiveError();
        }

        // check bot auth
        checkCallerAuth(_strategyId);

        // check if all the triggers are true
        checkTriggers(_strategyId, strategy, _triggerCallData, sub);

        // execute actions
        callActions(_strategyId, strategy, _actionsCallData);
    }

    /// @notice Checks if msg.sender has auth, reverts if not
    /// @param _strategyId Id of the strategy
    function checkCallerAuth(uint256 _strategyId) public view {
        address botAuthAddr = registry.getAddr(BOT_AUTH_ID);
        if (!(BotAuth(botAuthAddr).isApproved(_strategyId, msg.sender))){
            revert BotNotApprovedError();
        }
    }

    /// @notice Checks if all the triggers are true, reverts if not
    /// @param _strategy Strategy data we have in storage
    /// @param _triggerCallData All input data needed to execute triggers
    function checkTriggers(
        uint _strategyId,
        Strategy memory _strategy,
        bytes[][] memory _triggerCallData,
        Subscriptions _sub
    ) public {

        bytes32[] memory triggerIds = _sub.getTemplateFromStrategy(_strategyId).triggerIds;

        for (uint256 i = 0; i < triggerIds.length; ++i) {
            address triggerAddr = registry.getAddr(triggerIds[i]);

            // TODO: change the 0
            bool isTriggered = ITrigger(triggerAddr).isTriggered(_triggerCallData[i][0], _strategy.triggerData[i][0]);
            if (!(isTriggered)){
                revert TriggerNotActiveError();
            }
        }
    }

    /// @notice Execute all the actions in order
    /// @param _strategy Strategy data we have in storage
    /// @param _actionsCallData All input data needed to execute actions
    function callActions(uint _strategyId, Strategy memory _strategy, bytes[][] memory _actionsCallData) internal {
        address actionManagerProxyAddr = registry.getAddr(TASK_MANAGER_ID);

        ProxyAuth(PROXY_AUTH_ADDR).callExecute{value: msg.value}(
            _strategy.proxy,
            actionManagerProxyAddr,
            abi.encodeWithSignature(
                "executeStrategyTask(uint256,bytes[][])",
                _strategyId,
                _actionsCallData
            )
        );
    }
}
