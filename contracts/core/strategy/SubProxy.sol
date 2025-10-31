// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { AdminAuth } from "../../auth/AdminAuth.sol";
import { Permission } from "../../auth/Permission.sol";
import { SmartWalletUtils } from "../../utils/SmartWalletUtils.sol";
import { SubStorage } from "./SubStorage.sol";
import { IDFSRegistry } from "../../interfaces/core/IDFSRegistry.sol";
import { StrategyModel } from "./StrategyModel.sol";
import { CoreHelper } from "../../core/helpers/CoreHelper.sol";

/// @title Called through user wallet, handles auth and calls subscription contract
contract SubProxy is StrategyModel, AdminAuth, CoreHelper, Permission, SmartWalletUtils {
    IDFSRegistry public constant registry = IDFSRegistry(REGISTRY_ADDR);

    /// @notice Gives wallet permission if needed and registers a new sub
    /// @param _sub Subscription struct of the user (is not stored on chain, only the hash)
    function subscribeToStrategy(StrategySub calldata _sub) public {
        /// @dev Give wallet permission to our auth contract to be able to execute the strategy
        _givePermissionToAuthContract(_isDSProxy(address(this)));

        SubStorage(SUB_STORAGE_ADDR).subscribeToStrategy(_sub);
    }

    /// @notice Calls SubStorage to update the users subscription data
    /// @param _subId Id of the subscription to update
    /// @param _sub Subscription struct of the user (needs whole struct so we can hash it)
    function updateSubData(uint256 _subId, StrategySub calldata _sub) public {
        SubStorage(SUB_STORAGE_ADDR).updateSubData(_subId, _sub);
    }

    /// @notice Enables the subscription for execution if disabled
    /// @dev Must own the sub. to be able to enable it
    /// @param _subId Id of subscription to enable
    function activateSub(uint256 _subId) public {
        /// @dev Give wallet permission to our auth contract to be able to execute the strategy
        _givePermissionToAuthContract(_isDSProxy(address(this)));
        SubStorage(SUB_STORAGE_ADDR).activateSub(_subId);
    }

    /// @notice Updates subscription and enables the subscription for execution
    /// @dev Must own the sub. to be able to enable it
    /// @param _sub Subscription struct of the user (needs whole struct so we can hash it)
    function updateAndActivateSub(uint256 _subId, StrategySub calldata _sub) public {
        /// @dev Give wallet permission to our auth contract to be able to execute the strategy
        _givePermissionToAuthContract(_isDSProxy(address(this)));
        SubStorage(SUB_STORAGE_ADDR).updateSubData(_subId, _sub);
        SubStorage(SUB_STORAGE_ADDR).activateSub(_subId);
    }

    /// @notice Disables the subscription (will not be able to execute the strategy for the user)
    /// @dev Must own the sub. to be able to disable it
    /// @param _subId Id of subscription to disable
    function deactivateSub(uint256 _subId) public {
        SubStorage(SUB_STORAGE_ADDR).deactivateSub(_subId);
    }
}
