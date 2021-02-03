// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import "../auth/AdminAuth.sol";
import "../auth/ProxyPermission.sol";
import "../DS/DSGuard.sol";
import "../DS/DSAuth.sol";
import "./Subscriptions.sol";
import "./DFSRegistry.sol";

/// @title Handles auth and calls subscription contract
contract SubscriptionProxy is StrategyData, AdminAuth, ProxyPermission {

    address public constant REGISTRY_ADDR = 0xB0e1682D17A96E8551191c089673346dF7e1D467;
    DFSRegistry public constant registry = DFSRegistry(REGISTRY_ADDR);

    bytes32 constant PROXY_AUTH_ID = keccak256("ProxyAuth");
    bytes32 constant SUBSCRIPTION_ID = keccak256("Subscriptions");

    function createStrategy(
        uint _templateId,
        bool _active,
        bytes[][] memory _actionData,
        bytes[][] memory _triggerData
    ) public {
        address proxyAuthAddr = registry.getAddr(PROXY_AUTH_ID);
        address subAddr = registry.getAddr(SUBSCRIPTION_ID);

        givePermission(proxyAuthAddr);

        Subscriptions(subAddr).createStrategy(_templateId, _active, _actionData, _triggerData);
    }

    function createTemplate(
        string memory _name,
        bytes32[] memory _triggerIds,
        bytes32[] memory _actionIds,
        uint8[][] memory _paramMapping
    ) public {
        address subAddr = registry.getAddr(SUBSCRIPTION_ID);

        Subscriptions(subAddr).createTemplate(_name, _triggerIds, _actionIds, _paramMapping);
    }

    function createTemplateAndStrategy(
        string memory _name,
        bytes32[] memory _triggerIds,
        bytes32[] memory _actionIds,
        uint8[][] memory _paramMapping,
        bool _active,
        bytes[][] memory _actionData,
        bytes[][] memory _triggerData
    ) public {
        address proxyAuthAddr = registry.getAddr(PROXY_AUTH_ID);
        address subAddr = registry.getAddr(SUBSCRIPTION_ID);

        givePermission(proxyAuthAddr);

        uint templateId = 
            Subscriptions(subAddr).createTemplate(_name, _triggerIds, _actionIds, _paramMapping);

        Subscriptions(subAddr).createStrategy(templateId, _active, _actionData, _triggerData);
    }

    function updateStrategy(
        uint _strategyId,
        uint _templateId,
        bool _active,
        bytes[][] memory _actionData,
        bytes[][] memory _triggerData
    ) public {
        address subAddr = registry.getAddr(SUBSCRIPTION_ID);

        Subscriptions(subAddr).updateStrategy(_strategyId, _templateId, _active, _actionData, _triggerData);
    }

    function unsubscribeStrategy(uint256 _strategyId) public {
        address subAddr = registry.getAddr(SUBSCRIPTION_ID);

        Subscriptions(subAddr).removeStrategy(_strategyId);

        if (!Subscriptions(subAddr).userHasStrategies(address(this))) {
            address proxyAuthAddr = registry.getAddr(PROXY_AUTH_ID);
            removePermission(proxyAuthAddr);
        }
    }
}
