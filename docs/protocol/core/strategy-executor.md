---
icon: code-branch
---

# Strategy Executor

This is the main and only entry point to trigger the execution of strategies. The public function `executeStrategy()` is only callable by certain addresses, which is enforced by the `BotAuth` contract. Besides those checks, there are a few others; first because the bot calling is sending the  full `StrategySub` struct the hash is checked if it's valid. Second, each sub can be enabled/disabled by the user that created it, and there is also a check if the sub is allowed. Once the conditions are passed auth contract is called. In case user is using `Safe` smart wallet, `SafeModuleAuth` is called which is authorized by the owner of safe to execute transactions from safe module. In case of `DSProxy` smart wallet, `ProxyAuth` is called (which holds users `DSProxy` authorizations). From auth contract, `RecipeExecutor` is called which will execute a recipe in context of user's wallet.

{% hint style="info" %}
Triggers are not checked in the `StrategyExecutor` but rather in `RecipeExecutor` to enable changeable triggers and some minor gas cost savings.
{% endhint %}

Below is the interface of the contract:

```solidity
contract StrategyExecutor {

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
    ) public;

}
```

{% hint style="info" %}
For L2 networks, the `StrategyExecutor` implementation does not send the `_sub` field; it is read on-chain from `SubStorage`, as subscriptions are stored directly on-chain due to lower gas costs compared to mainnet.
{% endhint %}
