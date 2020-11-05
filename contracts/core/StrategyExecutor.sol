// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import "../utils/GasBurner.sol";
import "../interfaces/ITrigger.sol";
import "../interfaces/IDSProxy.sol";
import "./StrategyData.sol";
import "./Subscriptions.sol";
import "./BotAuth.sol";
import "./DFSRegistry.sol";
import "./ProxyAuth.sol";

/// @title Main entry point for executing automated strategies
contract StrategyExecutor is StrategyData, GasBurner {

    address public constant PROXY_AUTH_ADDR = 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512;

    address public constant REGISTRY_ADDR = 0x5FbDB2315678afecb367f032d93F642f64180aa3;
    DFSRegistry public constant registry = DFSRegistry(REGISTRY_ADDR);

    /// @notice Checks all the triggers and executes actions
    /// @dev Only auhtorized callers can execute it
    /// @param _strategyId Id of the strategy
    /// @param _triggerCallData All input data needed to execute triggers
    /// @param _actionsCallData All input data needed to execute actions
    function executeStrategy(
        uint256 _strategyId,
        bytes[] memory _triggerCallData,
        bytes[] memory _actionsCallData
    ) public burnGas {
        address subscriptionsAddr = registry.getAddr(keccak256("Subscriptions"));

        Strategy memory strategy = Subscriptions(subscriptionsAddr).getStrategy(_strategyId);
        require(strategy.active, "Strategy is not active");

        // check bot auth
        checkCallerAuth(_strategyId);

        // check if all the triggers are true
        checkTriggers(strategy, _triggerCallData, subscriptionsAddr);

        // execute actions
        callActions(strategy, _actionsCallData);
    }

    /// @notice Checks if msg.sender has auth, reverts if not
    /// @param _strategyId Id of the strategy
    function checkCallerAuth(uint256 _strategyId) public view {
        address botAuthAddr = registry.getAddr(keccak256("BotAuth"));
        require(
            BotAuth(botAuthAddr).isApproved(_strategyId, msg.sender),
            "msg.sender is not approved"
        );
    }

    /// @notice Checks if all the triggers are true, reverts if not
    /// @param _strategy Strategy data we have in storage
    /// @param _triggerCallData All input data needed to execute triggers
    function checkTriggers(
        Strategy memory _strategy,
        bytes[] memory _triggerCallData,
        address _subscriptionsAddr
    ) public {
        for (uint256 i = 0; i < _strategy.triggerIds.length; ++i) {
            Trigger memory trigger = Subscriptions(_subscriptionsAddr).getTrigger(
                _strategy.triggerIds[i]
            );
            address triggerAddr = registry.getAddr(trigger.id);

            bool isTriggered = ITrigger(triggerAddr).isTriggered(_triggerCallData[i], trigger.data);
            require(isTriggered, "Trigger not activated");
        }
    }

    /// @notice Execute all the actions in order
    /// @param _strategy Strategy data we have in storage
    /// @param _actionsCallData All input data needed to execute actions
    function callActions(Strategy memory _strategy, bytes[] memory _actionsCallData) internal {
        address actionManagerProxyAddr = registry.getAddr(keccak256("ActionManagerProxy"));

        ProxyAuth(PROXY_AUTH_ADDR).callExecute{value: msg.value}(
            _strategy.proxy,
            actionManagerProxyAddr,
            abi.encodeWithSignature(
                "manageActions(string,uint256[],bytes[])",
                _strategy.name,
                _strategy.actionIds,
                _actionsCallData
            )
        );
    }
}
