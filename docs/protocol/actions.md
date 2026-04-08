---
icon: location-crosshairs
---

# Actions

An Action is a contract that will perform a specific operation. In the context of DeFi, that includes actions such as supplying an asset, making a token swap, making a deposit, etc.&#x20;

Actions are registered in the `DFSRegistry` and can be combined into recipes. Actions are always called through a user's wallet (`Safe, DSProxy, DSAProxy, SummerFi wallet`) and cannot hold any state. Flashloan Actions are a special type of actions which can hold state (reentrancy field) but they are not called through user's wallet. There are currently only two types of actions: Standard action and `FlashLoan` action. We need to differentiate between these, as they will have different execution paths in the `RecipeExecutor`.

{% hint style="info" %}
When calling a FlashLoan action, it only makes sense to call them as part of a Recipe.  You also need to add an extra empty input in the callData if it's a FlashLoan action.
{% endhint %}

Each action should inherit the `ActionBase` contract, which implements a standard interface to call the actions and some helper functions or contracts to make development easier. Actions can be called directly through a user's walelt with `executeActionDirect()` which takes an array of bytes representing the inputs of that action. Each action can have different inputs and in order to keep a universal interface, all the inputs are converted into a bytes array before calling. Action always returns one `bytes32` value, which can later be used as input for other actions.

{% hint style="info" %}
While a single Action can be executed as a Recipe through the `RecipeExecutor`, it is more gas efficient to call a single Action directly when needed.
{% endhint %}

Each action should also produce a log message in the standard `DFSLogger`.

Actions can be bundled into Recipes, which can then be executed manually or as part of a Strategy. Because of this, some of the inputs of an Action can be hardcoded in Subscription data or it can be an output of a different Action. That's why when an Action is executed inside of a recipe a different function is used `executeAction()`. Here `subData` is passed along as well as `paramMapping` data and `returnValues` from previous functions.

### Return values and subscription data mapping

`paramMapping` is an array of `uint8` values representing if any inputs of the actions need to be switched out, either with `subData` or by `returnValues`.

If the value is 0, this means the inputs are used and not modified. Values in the range of `[1-127]` are used for `returnValues` mapping, meaning that 1 means the return value of the first action, 2 represents the second action return values, etc... going up to 127.&#x20;

If values are in the `[127-255]` range that means that the `Subscriptions` subData is used to replace inputs, following the same logic as return values in how they are mapped.

{% hint style="info" %}
The last values in the subData range, 254 and 255 are 'reserved'. That means that the ActionBase contract and the related parseParam methods will inject:

* for 254 the address of the user's wallet
* for 255 will inject the address of the:
  * owner of the DSProxy if wallet is DSProxy.
  * owner of Safe, in case of 1/1 wallet, and safe wallet itself in case of n/m wallet
{% endhint %}

```
// Mapping example
// In an action that has 3 inputs, the first two are not changed
// and the third one will be changed with the return value of the second action
[0, 0, 2] 
```

Below is the interface of the ActionBase:

```solidity
contract ActionBase {

    enum ActionType { FL_ACTION, STANDARD_ACTION, FEE_ACTION, CHECK_ACTION, CUSTOM_ACTION }

    /// @notice Parses inputs and runs the implemented action through a user's wallet
    /// @dev Is called by the RecipeExecutor chaining actions together
    /// @param _callData Array of input values each value encoded as bytes
    /// @param _subData Array of subscribed vales, replaces input values if specified
    /// @param _paramMapping Array that specifies how return and subscribed values are mapped in input
    /// @param _returnValues Returns values from actions before, which can be injected in inputs
    /// @return Returns a bytes32 value, each actions implements what that value is
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual returns (bytes32);

    /// @notice Parses inputs and runs the single action through a user's wallet
    /// @dev Used to save gas when executing a single action directly
    function executeActionDirect(bytes memory _callData) public virtual payable;

    /// @notice Returns the type of action we are implementing
    function actionType() public pure virtual returns (uint8);
}
```
