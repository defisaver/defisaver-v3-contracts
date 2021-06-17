// SPDX-License-Identifier: MIT

pragma solidity =0.8.4;

import "../../auth/AdminAuth.sol";
import "../../interfaces/ITrigger.sol";
import "../../interfaces/IDSProxy.sol";
import "./StrategyData.sol";
import "./Subscriptions.sol";
import "./BotAuth.sol";
import "../DFSRegistry.sol";
import "./ProxyAuth.sol";


/// @title Main entry point for executing automated strategies
contract StrategyExecutor is StrategyData, AdminAuth {

    bytes4 constant PROXY_AUTH_ID = bytes4(keccak256("ProxyAuth"));

    address public constant REGISTRY_ADDR = 0xD6049E1F5F3EfF1F921f5532aF1A1632bA23929C;
    DFSRegistry public constant registry = DFSRegistry(REGISTRY_ADDR);

    bytes4 constant BOT_AUTH_ID = bytes4(keccak256("BotAuth"));
    bytes4 constant SUBSCRIPTION_ID = bytes4(keccak256("Subscriptions"));
    bytes4 constant TASK_EXECUTOR_ID = bytes4(keccak256("RecipeExecutor"));

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
        bytes[] memory _triggerCallData,
        bytes[][] memory _actionsCallData
    ) public {
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
        bytes[] memory _triggerCallData,
        Subscriptions _sub
    ) public {

        bytes4[] memory triggerIds = _sub.getTemplateFromStrategy(_strategyId).triggerIds;

        for (uint256 i = 0; i < triggerIds.length; ++i) {
            address triggerAddr = registry.getAddr(triggerIds[i]);

            bool isTriggered = ITrigger(triggerAddr).isTriggered(_triggerCallData[i], _strategy.triggerData[i]);
            if (!(isTriggered)){
                revert TriggerNotActiveError();
            }
        }
    }

    /// @notice Execute all the actions in order
    /// @param _strategy Strategy data we have in storage
    /// @param _actionsCallData All input data needed to execute actions
    function callActions(uint _strategyId, Strategy memory _strategy, bytes[][] memory _actionsCallData) internal {
        address RecipeExecutorAddr = registry.getAddr(TASK_EXECUTOR_ID);

        address proxyAuthAddr = registry.getAddr(PROXY_AUTH_ID);

        ProxyAuth(proxyAuthAddr).callExecute{value: msg.value}(
            _strategy.proxy,
            RecipeExecutorAddr,
            abi.encodeWithSignature(
                "executeStrategyTask(uint256,bytes[][])",
                _strategyId,
                _actionsCallData
            )
        );
    }
}
