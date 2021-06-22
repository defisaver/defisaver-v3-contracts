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

    address public constant REGISTRY_ADDR = 0xD5cec8F03f803A74B60A7603Ed13556279376b09;
    DFSRegistry public constant registry = DFSRegistry(REGISTRY_ADDR);

    bytes4 constant PROXY_AUTH_ID = bytes4(keccak256("ProxyAuth"));
    bytes4 constant SUBSCRIPTION_ID = bytes4(keccak256("Subscriptions"));

    function createStrategy(
        uint64[] memory _templateIds,
        bool _active,
        bytes[] memory _subData,
        bytes[] memory _triggerData
    ) public {
        address proxyAuthAddr = registry.getAddr(PROXY_AUTH_ID);
        address subAddr = registry.getAddr(SUBSCRIPTION_ID);

        givePermission(proxyAuthAddr);

        Subscriptions(subAddr).createStrategy(_templateIds, _active, _subData, _triggerData);
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

    function updateStrategy(
        uint _strategyId,
        uint64[] memory _templateIds,
        bool _active,
        bytes[] memory _subData,
        bytes[] memory _triggerData
    ) public {
        address subAddr = registry.getAddr(SUBSCRIPTION_ID);

        Subscriptions(subAddr).updateStrategy(_strategyId, _templateIds, _active, _subData, _triggerData);
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
