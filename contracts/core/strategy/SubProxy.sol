// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../../auth/AdminAuth.sol";
import "../../auth/ProxyPermission.sol";
import "../../DS/DSGuard.sol";
import "../../DS/DSAuth.sol";
import "./SubStorage.sol";
import "../DFSRegistry.sol";

/// @title Called through DSProxy, handles auth and calls subscription contract
contract SubProxy is StrategyModel, AdminAuth, ProxyPermission, CoreHelper {

    DFSRegistry public constant registry = DFSRegistry(REGISTRY_ADDR);

    // TODO: Switch to constant hardcoded addresses for gas saving
    bytes4 constant PROXY_AUTH_ID = bytes4(keccak256("ProxyAuth"));
    bytes4 constant SUB_STORAGE_ID = bytes4(keccak256("SubStorage"));

    /// @notice Gives DSProxy permission if needed and registers a new sub
    /// @param _sub Subscription struct of the user (is not stored on chain, only the hash)
    function subscribeToStrategy(
        StrategySub calldata _sub
    ) public {
        address proxyAuthAddr = registry.getAddr(PROXY_AUTH_ID);
        address subStorageAddr = registry.getAddr(SUB_STORAGE_ID);

        givePermission(proxyAuthAddr);

        SubStorage(subStorageAddr).subscribeToStrategy(_sub);
    }

    /// @notice Calls SubStorage to update the users subscription data
    /// @param _subId Id of the subscription to update
    /// @param _sub Subscription struct of the user (needs whole struct so we can hash it)
    function updateSubData(
        uint256 _subId,
        StrategySub calldata _sub
    ) public {
        address subStorageAddr = registry.getAddr(SUB_STORAGE_ID);

        SubStorage(subStorageAddr).updateSubData(_subId, _sub);
    }

    /// @notice Enables the subscription for execution if disabled
    /// @dev Must own the sub. to be able to enable it
    /// @param _subId Id of subscription to enable
    function activateSub(
        uint _subId
    ) public {
        address subStorageAddr = registry.getAddr(SUB_STORAGE_ID);

        SubStorage(subStorageAddr).activateSub(_subId);
    }

    /// @notice Disables the subscription (will not be able to execute the strategy for the user)
    /// @dev Must own the sub. to be able to disable it
    /// @param _subId Id of subscription to disable
    function deactivateSub(
        uint _subId
    ) public {
        address subStorageAddr = registry.getAddr(SUB_STORAGE_ID);

        SubStorage(subStorageAddr).deactivateSub(_subId);
    }
}
