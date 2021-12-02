// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../../auth/AdminAuth.sol";
import "../../auth/ProxyPermission.sol";
import "./StrategyStorage.sol";
import "./BundleStorage.sol";
import "../DFSRegistry.sol";

/// @title Called through DSProxy calls strategy storage contract
contract StrategyProxy is StrategyModel, AdminAuth, ProxyPermission, CoreHelper {

    DFSRegistry public constant registry = DFSRegistry(REGISTRY_ADDR);

    bytes4 constant STRATEGY_STORAGE_ID = bytes4(keccak256("StrategyStorage"));
    bytes4 constant BUNDLE_STORAGE_ID = bytes4(keccak256("BundleStorage"));

    /// @notice Calls strategy sub through DSProxy
    /// @param _name Name of the strategy useful for logging what strategy is executing
    /// @param _triggerIds Array of identifiers for trigger - bytes4(keccak256(TriggerName))
    /// @param _actionIds Array of identifiers for actions - bytes4(keccak256(ActionName))
    /// @param _paramMapping Describes how inputs to functions are piped from return/subbed values
    /// @param _continuous If the action is repeated (continuos) or one time
    function createStrategy(
        string memory _name,
        bytes4[] memory _triggerIds,
        bytes4[] memory _actionIds,
        uint8[][] memory _paramMapping,
        bool _continuous
    ) public {
        address strategyStorageAddr = registry.getAddr(STRATEGY_STORAGE_ID);

        StrategyStorage(strategyStorageAddr).createStrategy(_name, _triggerIds, _actionIds, _paramMapping, _continuous);
    }

    /// @notice Calls bundle storage through dsproxy to create new bundle
    /// @param _strategyIds Array of strategyIds that go into a bundle
    function createBundle(
        uint64[] memory _strategyIds
    ) public {
        address bundleStorageAddr = registry.getAddr(BUNDLE_STORAGE_ID);

        BundleStorage(bundleStorageAddr).createBundle(_strategyIds);
    }  
}
