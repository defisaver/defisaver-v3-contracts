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
    StrategyTemplate[] internal strategyTemplates;

    // TODO: first element should be empty

    function subscribe(
        uint templateId, 
        bytes[][] memory actionData,
        bytes[][] memory triggerData
    ) public {
        
        strategies.push(
            Strategy({
                templateId: templateId,
                proxy: msg.sender,
                active: true,
                actionData: actionData,
                triggerData: triggerData
            })
        );

        logger.Log(address(this), msg.sender, "Subscribe", abi.encode(strategies.length - 1));
    }

    // TODO: what if we have more/less actions then in the original strategy?

    // function update(
    //     uint256 _subId,
    //     Trigger[] memory _triggers,
    //     Action[] memory _actions
    // ) public {
    //     Strategy memory s = strategies[_subId];
    //     require(s.proxy != address(0), "Strategy does not exist");
    //     require(msg.sender == s.proxy, "Proxy not strategy owner");

    //     // update triggers
    //     for (uint256 i = 0; i < _triggers.length; ++i) {
    //         triggers[s.triggerIds[i]] = Trigger({
    //             id: _triggers[i].id,
    //             data: _triggers[i].data,
    //             inputMapping:_triggers[i].inputMapping
    //         });
    //     }

    //     // update actions
    //     for (uint256 i = 0; i < _actions.length; ++i) {
    //         actions[s.actionIds[i]] = Action({
    //             id: _actions[i].id,
    //             data: _actions[i].data,
    //             inputMapping: _actions[i].inputMapping
    //         });
    //     }

    //     logger.Log(address(this), msg.sender, "Update", abi.encode(_subId));
    // }

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

    function getTemplate(uint _templateId) public view returns (StrategyTemplate memory) {
        return strategyTemplates[_templateId];
    }

    function getTemplateFromSub(uint _subId) public view returns (StrategyTemplate memory) {
        uint templateId = strategies[_subId].templateId;
        return strategyTemplates[templateId];
    }

    function getReturnInjections(uint _subId) public view returns (uint8[][] memory) {
        uint templateId = strategies[_subId].templateId;
        return strategyTemplates[templateId].paramMapping;
    }

    function getTriggerIds(uint _subId) public view returns (bytes32[] memory) {
        uint templateId = strategies[_subId].templateId;
        return strategyTemplates[templateId].triggerIds;
    }

    function getActionIds(uint _subId) public view returns (bytes32[] memory) {
        uint templateId = strategies[_subId].templateId;
        return strategyTemplates[templateId].actionIds;
    }

    function getStreategyCount() public view returns (uint256) {
        return strategies.length;
    }

    function getStrategy(uint256 _subId) public view returns (Strategy memory) {
        return strategies[_subId];
    }
}
