// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IAuth } from "../../interfaces/core/IAuth.sol";
import { IRecipeExecutor } from "../../interfaces/core/IRecipeExecutor.sol";
import { AdminAuth } from "../../auth/AdminAuth.sol";
import { SmartWalletUtils } from "../../utils/SmartWalletUtils.sol";
import { StrategyModel } from "./StrategyModel.sol";
import { BotAuth } from "./BotAuth.sol";
import { IDFSRegistry } from "../../interfaces/core/IDFSRegistry.sol";
import { SubStorage } from "../strategy/SubStorage.sol";
import { CoreHelper } from "../helpers/CoreHelper.sol";
import { WalletType } from "../../utils/DFSTypes.sol";
import { DFSIds } from "../../utils/DFSIds.sol";

/// @title Main entry point for executing automated strategies
contract StrategyExecutor is StrategyModel, AdminAuth, CoreHelper, SmartWalletUtils {
    IDFSRegistry private constant registry = IDFSRegistry(REGISTRY_ADDR);

    /// Caller must be authorized bot
    error BotNotApproved(address, uint256);
    /// Subscription must be enabled
    error SubNotEnabled(uint256);
    /// Subscription data hash must match stored subData hash
    error SubDatHashMismatch(uint256, bytes32, bytes32);

    /// @notice Checks all the triggers and executes actions
    /// @dev Only authorized callers can execute it
    /// @param _subId Id of the subscription
    /// @param _strategyIndex Which strategy in a bundle, need to specify because when sub is part of a bundle
    /// @param _triggerCallData All input data needed to execute triggers
    /// @param _actionsCallData All input data needed to execute actions
    /// @param _sub StrategySub struct needed because on-chain we store only the hash
    function executeStrategy(
        uint256 _subId,
        uint256 _strategyIndex,
        bytes[] calldata _triggerCallData,
        bytes[] calldata _actionsCallData,
        StrategySub memory _sub
    ) public {
        // check bot auth
        if (!checkCallerAuth(_subId)) {
            revert BotNotApproved(msg.sender, _subId);
        }

        StoredSubData memory storedSubData = SubStorage(SUB_STORAGE_ADDR).getSub(_subId);

        bytes32 subDataHash = keccak256(abi.encode(_sub));

        // data sent from the caller must match the stored hash of the data
        if (subDataHash != storedSubData.strategySubHash) {
            revert SubDatHashMismatch(_subId, subDataHash, storedSubData.strategySubHash);
        }

        // subscription must be enabled
        if (!storedSubData.isEnabled) {
            revert SubNotEnabled(_subId);
        }

        // execute actions
        callActions(_subId, _actionsCallData, _triggerCallData, _strategyIndex, _sub, address(storedSubData.walletAddr));
    }

    /// @notice Checks if msg.sender has auth, reverts if not
    /// @param _subId Id of the strategy
    function checkCallerAuth(uint256 _subId) internal view returns (bool) {
        return BotAuth(registry.getAddr(DFSIds.BOT_AUTH)).isApproved(_subId, msg.sender);
    }

    /// @notice Calls auth contract which has the auth from the user wallet which will call RecipeExecutor
    /// @param _subId Strategy data we have in storage
    /// @param _actionsCallData All input data needed to execute actions
    /// @param _triggerCallData All input data needed to check triggers
    /// @param _strategyIndex Which strategy in a bundle, need to specify because when sub is part of a bundle
    /// @param _sub StrategySub struct needed because on-chain we store only the hash
    /// @param _userWallet Address of the user's wallet
    function callActions(
        uint256 _subId,
        bytes[] calldata _actionsCallData,
        bytes[] calldata _triggerCallData,
        uint256 _strategyIndex,
        StrategySub memory _sub,
        address _userWallet
    ) internal {
        WalletType walletType = _getWalletType(_userWallet);

        address authAddr = MODULE_AUTH_ADDR;
        if (walletType == WalletType.DSPROXY) authAddr = PROXY_AUTH_ADDR;
        if (walletType == WalletType.DSAPROXY) authAddr = DSA_AUTH_ADDR;

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
