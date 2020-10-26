// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import "../interfaces/IDSProxy.sol";
import "../utils/DefisaverLogger.sol";
import "./StrategyData.sol";

/// @title Storage of actions and triggers which can be added/removed and modified
contract Subscriptions is StrategyData {
    DefisaverLogger public constant logger = DefisaverLogger(
        0x5c55B921f590a89C1Ebe84dF170E655a82b62126
    );

    Strategy[] internal strategies;
    Action[] internal actions;
    Trigger[] internal triggers;

    /// @notice Subscribes a new strategy for a user
    /// @param _triggers Array of trigger data
    /// @param _actions Array of action data
    function subscribe(
        string memory _name,
        Trigger[] memory _triggers,
        Action[] memory _actions
    ) public {
        uint256[] memory triggerIds = new uint256[](_triggers.length);
        uint256[] memory actionsIds = new uint256[](_actions.length);

        // Populate triggers
        for (uint256 i = 0; i < _triggers.length; ++i) {
            triggers.push(Trigger({id: _triggers[i].id, data: _triggers[i].data}));

            triggerIds[i] = triggers.length - 1;
        }

        // Populate actions
        for (uint256 i = 0; i < _actions.length; ++i) {
            actions.push(Action({id: _actions[i].id, data: _actions[i].data}));

            actionsIds[i] = actions.length - 1;
        }

        strategies.push(
            Strategy({
                name: _name,
                proxy: msg.sender,
                active: true,
                triggerIds: triggerIds,
                actionIds: actionsIds
            })
        );

        logger.Log(address(this), msg.sender, "Subscribe", abi.encode(strategies.length - 1));
    }

    // TODO: what if we have more/less actions then in the original strategy?

    /// @notice Update an existing strategy
    /// @param _subId Subscription id
    /// @param _triggers Array of trigger data
    /// @param _actions Array of action data
    function update(
        uint256 _subId,
        Trigger[] memory _triggers,
        Action[] memory _actions
    ) public {
        Strategy memory s = strategies[_subId];
        require(s.proxy != address(0), "Strategy does not exist");
        require(msg.sender == s.proxy, "Proxy not strategy owner");

        // update triggers
        for (uint256 i = 0; i < _triggers.length; ++i) {
            triggers[s.triggerIds[i]] = Trigger({id: _triggers[i].id, data: _triggers[i].data});
        }

        // update actions
        for (uint256 i = 0; i < _actions.length; ++i) {
            actions[s.actionIds[i]] = Action({id: _actions[i].id, data: _actions[i].data});
        }

        logger.Log(address(this), msg.sender, "Update", abi.encode(_subId));
    }

    /// @notice Unsubscribe an existing strategy
    /// @param _subId Subscription id
    function unsubscribe(uint256 _subId) public {
        Strategy memory s = strategies[_subId];
        require(s.proxy != address(0), "Strategy does not exist");
        require(msg.sender == s.proxy, "Proxy not strategy owner");

        strategies[_subId].active = false;

        logger.Log(address(this), msg.sender, "Unsubscribe", abi.encode(_subId));
    }

    function getProxyOwner(address _proxy) internal returns (address proxyOwner) {
        proxyOwner = IDSProxy(_proxy).owner();
        require(proxyOwner != address(0), "No proxy");
    }

    ///////////////////// VIEW ONLY FUNCTIONS ////////////////////////////

    function getTrigger(uint256 _triggerId) public view returns (Trigger memory) {
        return triggers[_triggerId];
    }

    function getAction(uint256 _actionId) public view returns (Action memory) {
        return actions[_actionId];
    }

    function getStreategyCount() public view returns (uint256) {
        return strategies.length;
    }

    function getStrategy(uint256 _subId) public view returns (Strategy memory) {
        return strategies[_subId];
    }
}
