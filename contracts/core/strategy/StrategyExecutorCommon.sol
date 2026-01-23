// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IAuth } from "../../interfaces/core/IAuth.sol";
import { IRecipeExecutor } from "../../interfaces/core/IRecipeExecutor.sol";
import { IDFSRegistry } from "../../interfaces/core/IDFSRegistry.sol";

import { AdminAuth } from "../../auth/AdminAuth.sol";
import { SmartWalletUtils } from "../../utils/SmartWalletUtils.sol";
import { StrategyModel } from "./StrategyModel.sol";
import { BotAuth } from "./BotAuth.sol";
import { CoreHelper } from "../helpers/CoreHelper.sol";
import { DFSIds } from "../../utils/DFSIds.sol";

/// @title StrategyExecutorCommon - Common contract used by StrategyExecutor and StrategyExecutorL2
abstract contract StrategyExecutorCommon is StrategyModel, AdminAuth, CoreHelper, SmartWalletUtils {
    IDFSRegistry private constant registry = IDFSRegistry(REGISTRY_ADDR);

    /// Caller must be authorized bot
    error BotNotApproved(address, uint256);
    /// Subscription must be enabled
    error SubNotEnabled(uint256);

    /// @notice Checks if msg.sender has auth, reverts if not
    /// @param _subId Id of the strategy
    function _checkCallerAuth(uint256 _subId) internal view returns (bool) {
        return BotAuth(registry.getAddr(DFSIds.BOT_AUTH)).isApproved(_subId, msg.sender);
    }

    /// @notice Calls auth contract which has the auth from the user wallet which will call RecipeExecutor
    /// @param _subId Strategy data we have in storage
    /// @param _actionsCallData All input data needed to execute actions
    /// @param _triggerCallData All input data needed to check triggers
    /// @param _strategyIndex Which strategy in a bundle, need to specify because when sub is part of a bundle
    /// @param _sub StrategySub struct needed because on-chain we store only the hash
    /// @param _userWallet Address of the user's wallet
    function _callActions(
        uint256 _subId,
        bytes[] calldata _actionsCallData,
        bytes[] calldata _triggerCallData,
        uint256 _strategyIndex,
        StrategySub memory _sub,
        address _userWallet
    ) internal {
        address authAddr = _isDSProxy(_userWallet) ? PROXY_AUTH_ADDR : MODULE_AUTH_ADDR;

        IAuth(authAddr).callExecute{ value: msg.value }(
            _userWallet,
            registry.getAddr(DFSIds.RECIPE_EXECUTOR),
            abi.encodeWithSelector(
                IRecipeExecutor.executeRecipeFromStrategy.selector,
                _subId,
                _actionsCallData,
                _triggerCallData,
                _strategyIndex,
                _sub
            )
        );
    }
}
