// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../../interfaces/IAuth.sol";
import "../../auth/AdminAuth.sol";
import "../../utils/CheckWalletType.sol";
import "../strategy/StrategyModel.sol";
import "../strategy/BotAuth.sol";
import "../DFSRegistry.sol";
import "./SubStorageL2.sol";

/// @title Main entry point for executing automated strategies
contract StrategyExecutorL2 is StrategyModel, AdminAuth, CoreHelper, CheckWalletType {

    DFSRegistry public constant registry = DFSRegistry(REGISTRY_ADDR);

    bytes4 constant EXECUTE_RECIPE_FROM_STRATEGY_SELECTOR = 
        bytes4(keccak256("executeRecipeFromStrategy(uint256,bytes[],bytes[],uint256,(uint64,bool,bytes[],bytes32[]))"));

    bytes4 constant BOT_AUTH_ID = bytes4(keccak256("BotAuth"));

    /// Caller must be authorized bot
    error BotNotApproved(address, uint256);
    /// Subscription must be enabled
    error SubNotEnabled(uint256);

    /// @notice Checks all the triggers and executes actions
    /// @dev Only authorized callers can execute it
    /// @param _subId Id of the subscription
    /// @param _strategyIndex Which strategy in a bundle, need to specify because when sub is part of a bundle
    /// @param _triggerCallData All input data needed to execute triggers
    /// @param _actionsCallData All input data needed to execute actions
    function executeStrategy(
        uint256 _subId,
        uint256 _strategyIndex,
        bytes[] calldata _triggerCallData,
        bytes[] calldata _actionsCallData
    ) public {
        // check bot auth
        if (!checkCallerAuth(_subId)) {
            revert BotNotApproved(msg.sender, _subId);
        }

        StoredSubData memory storedSubData = SubStorageL2(SUB_STORAGE_ADDR).getSub(_subId);
        StrategySub memory _sub = SubStorageL2(SUB_STORAGE_ADDR).getStrategySub(_subId);

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
        return BotAuth(registry.getAddr(BOT_AUTH_ID)).isApproved(_subId, msg.sender);
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
        address authAddr = isDSProxy(_userWallet) ? PROXY_AUTH_ADDR : MODULE_AUTH_ADDR;

        IAuth(authAddr).callExecute{value: msg.value}(
            _userWallet,
            RECIPE_EXECUTOR_ADDR,
            abi.encodeWithSelector(
                EXECUTE_RECIPE_FROM_STRATEGY_SELECTOR,
                _subId,
                _actionsCallData,
                _triggerCallData,
                _strategyIndex,
                _sub
            )
        );
    }
}