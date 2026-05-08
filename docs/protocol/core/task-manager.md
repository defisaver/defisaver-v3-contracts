---
icon: code-branch
---

# Recipe Executor

Recipe Executor is the main entry point of execution of recipes; it can be called directly (when a user manually executes a set of actions), through `StrategyExecutor` when the Recipe is part of a strategy or through `TxSaverExecutor` when it is part of TxSaver transaction. The contract checks if the first action is a special flash loan action type and adequately sets up the code to execute the flash loan.

**Recipe Executor is always called through a user's wallet** and can't hold any state. There are few entry points to recipe execution:

1. `executeRecipe()` -> used when the recipe is executed manually
2. `executeActionsFromFL` -> called by FL contract as part of callback. Used in flashloan recipes.
3. `executeRecipeFromStrategy()` -> called by `StrategyExecutor` . See [strategy-executor.md](strategy-executor.md "mention").
4. `executeRecipeFromTxSaver()` -> called by `TxSaverExecutor` . See [txsaver.md](../txsaver.md "mention").

```solidity
/// @dev List of actions grouped as a recipe
/// @param name Name of the recipe useful for logging what recipe is executing
/// @param callData Array of calldata inputs to each action
/// @param subData Used only as part of strategy, subData injected from StrategySub.subData
/// @param actionIds Array of identifiers for actions - bytes4(keccak256(ActionName))
/// @param paramMapping Describes how inputs to functions are piped from return/subbed values
struct Recipe {
    string name;
    bytes[] callData;
    bytes32[] subData;
    bytes4[] actionIds;
    uint8[][] paramMapping;
}
```

When the recipe is called through the `StrategyExecutor` there are additional checks if the triggers are executed correctly. All triggers must return true for the execution to continue. After that, from the Strategy data a new Recipe object is created and goes through the same flow as a manually executed recipe.&#x20;

{% hint style="info" %}
Triggers can be changeable! If Trigger returns true to a `isChangeable()` call after the trigger is checked, the sub-data of that trigger can be updated. Useful for strategies, for example, where on every five days some recipe happens, trigger adds five days from the last execution as the next trigger date.
{% endhint %}

Recipe Executor also handles a particular type of actions `Flash loan` actions. Flash loan actions are always sent first, and they callback the Recipe Executor through the `executeActionsFromFL` function.

Below is the interface of the contract:

```solidity
interface IRecipeExecutor {
    /// @notice Called directly through user wallet to execute a recipe
    /// @dev This is the main entry point for Recipes executed manually
    /// @param _currRecipe Recipe to be executed
    function executeRecipe(StrategyModel.Recipe calldata _currRecipe) external payable;
    
    /// @notice Called by TxSaverExecutor through safe wallet
    /// @param _currRecipe Recipe to be executed
    /// @param _txSaverData TxSaver data signed by user
    function executeRecipeFromTxSaver(
        StrategyModel.Recipe calldata _currRecipe,
        StrategyModel.TxSaverSignedData calldata _txSaverData
    ) external payable;
    
    /// @notice Called by user wallet through the auth contract to execute a recipe & check triggers
    /// @param _subId Id of the subscription we want to execute
    /// @param _actionCallData All input data needed to execute actions
    /// @param _triggerCallData All input data needed to check triggers
    /// @param _strategyIndex Which strategy in a bundle, need to specify because when sub is part of a bundle
    /// @param _sub All the data related to the strategies Recipe
    function executeRecipeFromStrategy(
        uint256 _subId,
        bytes[] calldata _actionCallData,
        bytes[] calldata _triggerCallData,
        uint256 _strategyIndex,
        StrategyModel.StrategySub memory _sub
    ) external payable;
    
    /// @notice This is the callback function that FL actions call
    /// @dev FL function must be the first action and repayment is done last
    /// @param _currRecipe Recipe to be executed
    /// @param _flAmount Result value from FL action
    function executeActionsFromFL(StrategyModel.Recipe calldata _currRecipe, bytes32 _flAmount)
        external
        payable;
}
```
