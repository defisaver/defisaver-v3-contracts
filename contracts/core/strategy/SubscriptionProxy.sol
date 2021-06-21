// SPDX-License-Identifier: MIT

pragma solidity =0.8.4;

import "../../auth/AdminAuth.sol";
import "../../auth/ProxyPermission.sol";
import "../../DS/DSGuard.sol";
import "../../DS/DSAuth.sol";
import "./Subscriptions.sol";
import "../DFSRegistry.sol";

/// @title Handles auth and calls subscription contract
contract SubscriptionProxy is StrategyData, AdminAuth, ProxyPermission {

    address public constant REGISTRY_ADDR = 0xcD0048A5628B37B8f743cC2FeA18817A29e97270;
    DFSRegistry public constant registry = DFSRegistry(REGISTRY_ADDR);

    bytes4 constant PROXY_AUTH_ID = bytes4(keccak256("ProxyAuth"));
    bytes4 constant SUBSCRIPTION_ID = bytes4(keccak256("Subscriptions"));

    function createStrategy(
        uint64 _templateId,
        bool _active,
        bytes[] memory _subData,
        bytes[] memory _triggerData
    ) public {
        address proxyAuthAddr = registry.getAddr(PROXY_AUTH_ID);
        address subAddr = registry.getAddr(SUBSCRIPTION_ID);

        givePermission(proxyAuthAddr);

        Subscriptions(subAddr).createStrategy(_templateId, _active, _subData, _triggerData);
    }

    function createTemplate(
        string memory _name,
        bytes4[] memory _triggerIds,
        bytes4[] memory _actionIds,
        uint8[][] memory _paramMapping
    ) public {
        address subAddr = registry.getAddr(SUBSCRIPTION_ID);

        Subscriptions(subAddr).createTemplate(_name, _triggerIds, _actionIds, _paramMapping);
    }

    function createTemplateAndStrategy(
        string memory _name,
        bytes4[] memory _triggerIds,
        bytes4[] memory _actionIds,
        uint8[][] memory _paramMapping,
        bool _active,
        bytes[] memory _subData,
        bytes[] memory _triggerData
    ) public {
        address proxyAuthAddr = registry.getAddr(PROXY_AUTH_ID);
        address subAddr = registry.getAddr(SUBSCRIPTION_ID);

        givePermission(proxyAuthAddr);

        uint64 templateId = 
            Subscriptions(subAddr).createTemplate(_name, _triggerIds, _actionIds, _paramMapping);

        Subscriptions(subAddr).createStrategy(templateId, _active, _subData, _triggerData);
    }

    function updateStrategy(
        uint _strategyId,
        uint64 _templateId,
        bool _active,
        bytes[] memory _subData,
        bytes[] memory _triggerData
    ) public {
        address subAddr = registry.getAddr(SUBSCRIPTION_ID);

        Subscriptions(subAddr).updateStrategy(_strategyId, _templateId, _active, _subData, _triggerData);
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
