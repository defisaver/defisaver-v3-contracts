---
icon: code-branch
---

# Safe Module Auth

This contract receives the user's `Safe` permission to perform actions on their behalf.

Each user that has their positions managed by a `Safe` wallet, is permitting other contracts to perform actions on their behalf. In Defi Saver the `SafeModuleAuth` contract receives that permission.

{% hint style="info" %}
Due to having permission for users' wallets, SafeModuleAuth is an immutable contract
{% endhint %}

The `SafeModuleAuth` has only one function `callExecute` which is only callable by the `StrategyExecutor` contract. The function calls the users `Safe` and performs the configured actions. This allows for the rest of the system to change while keeping the safe permission in a fixed contract.

Below is the interface of the contract:

```solidity
contract SafeModuleAuth {
    function callExecute(
        address _safeAddr,
        address _recipeExecutorAddr,
        bytes memory _callData
    ) external payable onlyExecutor notPaused;
}
```

{% hint style="info" %}
`callExecute` function has `notPaused` modifier which can be used to pause the system of strategy execution in the case of unexpected behaviour
{% endhint %}
