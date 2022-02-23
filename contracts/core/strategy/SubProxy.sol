// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../../auth/AdminAuth.sol";
import "../../auth/ProxyPermission.sol";
import "./SubStorage.sol";
import "../DFSRegistry.sol";

/// @title Called through DSProxy, handles auth and calls subscription contract
contract SubProxy is StrategyModel, AdminAuth, ProxyPermission, CoreHelper {

    DFSRegistry public constant registry = DFSRegistry(REGISTRY_ADDR);

    /// @notice Gives DSProxy permission if needed and registers a new sub
    /// @param _sub Subscription struct of the user (is not stored on chain, only the hash)
    function subscribeToStrategy(
        StrategySub calldata _sub
    ) public {
        givePermission(PROXY_AUTH_ADDR);

        SubStorage(SUB_STORAGE_ADDR).subscribeToStrategy(_sub);
    }

    /// @notice Calls SubStorage to update the users subscription data
    /// @param _subId Id of the subscription to update
    /// @param _sub Subscription struct of the user (needs whole struct so we can hash it)
    function updateSubData(
        uint256 _subId,
        StrategySub calldata _sub
    ) public {
        SubStorage(SUB_STORAGE_ADDR).updateSubData(_subId, _sub);
    }

    /// @notice Enables the subscription for execution if disabled
    /// @dev Must own the sub. to be able to enable it
    /// @param _subId Id of subscription to enable
    function activateSub(
        uint _subId
    ) public {
        SubStorage(SUB_STORAGE_ADDR).activateSub(_subId);
    }


    /// @notice Updates subscription and enables the subscription for execution
    /// @dev Must own the sub. to be able to enable it
    /// @param _sub Subscription struct of the user (needs whole struct so we can hash it)
    function updateAndActivateSub(
        uint _subId,
        StrategySub calldata _sub
    ) public {
        SubStorage(SUB_STORAGE_ADDR).updateSubData(_subId, _sub);
        SubStorage(SUB_STORAGE_ADDR).activateSub(_subId);
    }

    /// @notice Disables the subscription (will not be able to execute the strategy for the user)
    /// @dev Must own the sub. to be able to disable it
    /// @param _subId Id of subscription to disable
    function deactivateSub(
        uint _subId
    ) public {
        SubStorage(SUB_STORAGE_ADDR).deactivateSub(_subId);
    }
}
