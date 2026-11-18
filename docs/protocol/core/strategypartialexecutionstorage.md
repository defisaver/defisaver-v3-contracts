---
description: Tracks subscriptions that are in partial execution
icon: code-branch
---

# StrategyPartialExecutionStorage

StrategyPartialExecutionStorage tracks subscriptions of one-time strategies that are being executed over several transactions (partial execution). It is used when the backend can't execute a strategy in one transaction, for example due to high TSI when closing a very large position. For each subscription in partial execution, the contract stores the user's wallet and the ID of the strategy that was executed first. The subscription stays enabled in SubStorage the whole time, and RecipeExecutor skips the trigger check for it. Toggling or updating the subscription (ToggleSub, UpdateSub) clears the partial execution state.

{% hint style="info" %}
The state can go out of sync with SubStorage, e.g. if the user updates the subscription outside the UI. This is acceptable, as such subscriptions can be removed manually.&#x20;
{% endhint %}

Below is the interface of the contract:&#x20;



```solidity
/// @title StrategyPartialExecutionStorage
/// @notice This contract tracks the state of subscriptions that are in partial execution.
/// @dev Partial execution is used when backend can not execute strategy in one transaction (e.g. because of high TSI).
/// @dev Security assumptions:
/// - Only StrategyExecutor can approve the start of execution for a particular subscription.
/// - Only the subscription owner can start execution.
/// - Only the subscription owner or admin vault owner can end execution.
/// - The initial strategy ID represents metadata used by the backend and is preserved until execution ends.
/// - The state may become out of sync with SubStorage, e.g. if the user updates the subscription outside the UI.
///   This is acceptable, as such subscriptions can be removed manually.
/// - This contract is not expected to work with one-time strategies whose checker actions require trigger-written data,
///   as trigger execution is skipped (e.g. strategies using CompV3PriceTrigger, OffchainPriceTrigger...).
/// - At release, this contract will only be used with specific close strategies that do not have a final checker.
///   Supporting additional strategies in the future may require changes.
contract StrategyPartialExecutionStorage {

    /// @notice Approves the start of execution for a given subscription ID.
    /// @dev Only the StrategyExecutor can call this function.
    /// @param _subId Subscription ID for which execution is being approved.
    function approveStartOfExecution(uint256 _subId) external;
    
    /// @notice Revokes the approval to start execution for a given subscription ID.
    /// @dev Called by the sub's wallet (via RecipeExecutor) before the recipe's actions run.
    /// @dev Reverts if the approval was not granted in this transaction or the caller is not the sub owner.
    /// @param _subId Subscription ID for which the approval is being revoked.
    function clearStartApproval(uint256 _subId) external;
    
    /// @notice Only the sub owner can start execution; the initial strategy ID is preserved until the execution ends.
    /// @dev Records the first strategy without restricting which strategy a continuation can execute.
    /// @dev If the subscription is already in partial execution, this function is a no-op.
    /// @dev Reverts if the caller is not the sub owner or if not approved to start execution for the subscription.
    /// @param _subId Subscription entering partial execution.
    /// @param _strategyId Resolved StrategyStorage ID of the first partial execution.
    function startExecution(uint256 _subId, uint256 _strategyId) external;
    
    /// @notice Only sub owner or admin vault owner can end execution
    /// @dev Clears the partial execution state for the subscription.
    /// @dev If the subscription is not in partial execution, this function is a no-op.
    /// @dev Reverts if the caller is not the sub owner or the admin vault owner.
    /// @param _subId Subscription to end the partial execution for.
    function endExecution(uint256 _subId) external;
    
    /// @notice Returns the active wallet and the strategy ID selected by the first partial execution.
    /// @dev A zero wallet means inactive; strategy ID zero is valid for an active execution.
    ///      RecipeExecutor records the resolved strategy ID for both bundled and standalone strategies.
    /// @param _subId Subscription whose partial execution metadata is requested.
    /// @return wallet Active partial execution wallet, or zero when inactive.
    /// @return initialStrategyId StrategyStorage ID recorded when execution started.
    function getSubPartialExecutionState(uint256 _subId)
        external
        view
        returns (address wallet, uint256 initialStrategyId);
    
    /// @dev Returns the sub.walletAddr if subscription is in partial execution.
    /// @dev A zero wallet means the subscription is not in partial execution.
    /// @param _subId Subscription ID to check.
    function getSubPartialExecutionWallet(uint256 _subId) 
        public 
        view 
        returns (address);

    
    
    /// @notice Checks if a subscription is currently in partial execution.
    /// @param _subId Subscription ID to check.
    /// @return Returns true if the subscription is in partial execution, false otherwise.
    function isSubInPartialExecution(uint256 _subId) public view returns (bool);
}
```



