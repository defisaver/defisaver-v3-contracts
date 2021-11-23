// SPDX-License-Identifier: MIT

pragma solidity =0.8.4;

import "../../auth/AdminAuth.sol";
import "../../interfaces/IDSProxy.sol";
import "./StrategyModel.sol";
import "./BotAuth.sol";
import "../DFSRegistry.sol";
import "./ProxyAuth.sol";
import "../strategy/SubStorage.sol";
import "../strategy/StrategyStorage.sol";
import "../strategy/BundleStorage.sol";

/// @title Main entry point for executing automated strategies
contract StrategyExecutor is StrategyModel, AdminAuth {
    bytes4 constant PROXY_AUTH_ID = bytes4(keccak256("ProxyAuth"));

    address public constant REGISTRY_ADDR = 0xD5cec8F03f803A74B60A7603Ed13556279376b09;
    DFSRegistry public constant registry = DFSRegistry(REGISTRY_ADDR);

    bytes4 constant BOT_AUTH_ID = bytes4(keccak256("BotAuth"));
    bytes4 constant RECIPE_EXECUTOR_ID = bytes4(keccak256("RecipeExecutor"));

    bytes4 constant SUB_STORAGE_ID = bytes4(keccak256("SubStorage"));
    bytes4 constant STRATEGY_STORAGE_ID = bytes4(keccak256("StrategyStorage"));
    bytes4 constant BUNDLE_STORAGE_ID = bytes4(keccak256("BundleStorage"));

    error BotNotApprovedError(address, uint256);
    error SubNotActiveError(uint256);
    error SubDatHashMismatch(uint256, bytes32, bytes32);
    error StrategyHashMismatch(uint256, bytes32, bytes32);

    /// @notice Checks all the triggers and executes actions
    /// @dev Only authorized callers can execute it
    function executeStrategy(
        AutomationPayload memory _payload
    ) public {
        StoredSubData memory storedSubData = SubStorage(registry.getAddr(SUB_STORAGE_ID)).getSub(_payload._subId);

        bytes32 subDataHash = keccak256(abi.encode(_payload._sub));

        uint256 strategyId = _payload._sub.id;

        if (_payload._sub.isBundle) {
            address bundleStorageAddr = registry.getAddr(BUNDLE_STORAGE_ID);
            strategyId = BundleStorage(bundleStorageAddr).getStrategyId(_payload._sub.id, _payload._strategyIndex);
        }

        if (subDataHash != storedSubData.strategySubHash) {
            revert SubDatHashMismatch(strategyId, subDataHash, storedSubData.strategySubHash);
        }

        if (!storedSubData.isEnabled) {
            revert SubNotActiveError(strategyId);
        }

        // check bot auth
        bool botHasAuth = checkCallerAuth(strategyId);

        if (!botHasAuth) {
            revert BotNotApprovedError(msg.sender, strategyId);
        }

        ApprovedStrategy memory strategy = StrategyStorage(registry.getAddr(STRATEGY_STORAGE_ID)).getStrategy(strategyId);

        bytes32 strategyHash = keccak256(abi.encode(_payload._strategy));

        if (strategyHash != strategy.hashcheck) {
            revert StrategyHashMismatch(strategyId, strategyHash, strategy.hashcheck);
        }

        // execute actions
        callActions(address(storedSubData.userProxy), _payload);
    }

    /// @notice Checks if msg.sender has auth, reverts if not
    /// @param _subId Id of the strategy
    function checkCallerAuth(uint256 _subId) public view returns (bool) {
        return BotAuth(registry.getAddr(BOT_AUTH_ID)).isApproved(_subId, msg.sender);
    }


    /// @notice Checks triggers and execute all the actions in order
    function callActions(
        address _userProxy,
        AutomationPayload memory _payload
    ) internal {
        address RecipeExecutorAddr = registry.getAddr(RECIPE_EXECUTOR_ID);
        address proxyAuthAddr = registry.getAddr(PROXY_AUTH_ID);

        ProxyAuth(proxyAuthAddr).callExecute{value: msg.value}(
            _userProxy,
            RecipeExecutorAddr,
            abi.encodeWithSignature(
                "executeRecipeFromStrategy((uint256,uint256,bytes[],bytes[],(uint64,bool,bytes[],bytes32[]),(string,address,bytes4[],bytes4[],uint8[][],bool)))",
                _payload
            )
        );
    }
}