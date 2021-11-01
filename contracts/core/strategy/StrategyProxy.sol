// SPDX-License-Identifier: MIT

pragma solidity =0.8.4;

import "../../auth/AdminAuth.sol";
import "../../auth/ProxyPermission.sol";
import "../../DS/DSGuard.sol";
import "../../DS/DSAuth.sol";
import "./StrategyStorage.sol";
import "./BundleStorage.sol";
import "../DFSRegistry.sol";

contract StrategyProxy is StrategyModel, AdminAuth, ProxyPermission {

    address public constant REGISTRY_ADDR = 0xD5cec8F03f803A74B60A7603Ed13556279376b09;
    DFSRegistry public constant registry = DFSRegistry(REGISTRY_ADDR);

    bytes4 constant PROXY_AUTH_ID = bytes4(keccak256("ProxyAuth"));
    bytes4 constant STRATEGY_STORAGE_ID = bytes4(keccak256("StrategyStorage"));
    bytes4 constant BUNDLE_STORAGE_ID = bytes4(keccak256("BundleStorage"));

    function createStrategy(
        string memory _name,
        bytes4[] memory _triggerIds,
        bytes4[] memory _actionIds,
        uint8[][] memory _paramMapping,
        bool continuous
    ) public {
        address strategyStorageAddr = registry.getAddr(STRATEGY_STORAGE_ID);

        StrategyStorage(strategyStorageAddr).createStrategy(_name, _triggerIds, _actionIds, _paramMapping, continuous);
    }

    function createBundle(
        uint64[] memory _strategyIds
    ) public {
        address bundleStorageAddr = registry.getAddr(BUNDLE_STORAGE_ID);

        BundleStorage(bundleStorageAddr).createBundle(_strategyIds);

    }

    
}
