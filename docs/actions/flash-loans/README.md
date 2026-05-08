---
icon: bolt-lightning
---

# Flash loans

{% hint style="info" %}
In a DFS Recipe, flash loan actions must be the first action in the recipe. If a FL action is put anywhere else it will fail. The flash loan is returned after all other actions are finished, and it expects to have funds return to the FL action that took the loan.
{% endhint %}

Flash loan actions are a special kind of action in the DeFi Saver Recipe system. These are the only actions that do not run in a context of the user's wallet, but rather the action itself is the caller and the receiver of the flash loan. When calling a flash loan action, an additional empty callData is needed, as that is used to pass on the data of the other actions in the recipe.

{% hint style="info" %}
While other actions can be called directly (not through RecipeExecutor), flash loan actions can only be called through RecipeExecutor as it makes no sense to only call a flash loan action.
{% endhint %}

You may also notice that in every flash loan action there are 2 extra callData parameters `flParamGetterAddr` and `flParamGetterData`. Both can be used for on-chain getting of flash loan parameters. Because the flash loan action is always the first action, we can't pipe any previous action data into these actions, so we can call the `flParamGetterAddr` supplied by the user and on-chain fetch flash loan amounts and other info. This is needed where we for instance want to get the exact Maker Vault debt which changes from block to block, so that information must be fetched in that transaction.

Different flashloan sources supported at DefiSaver at the moment:

```solidity
enum FLSource {
    EMPTY,
    AAVEV2,
    BALANCER,
    GHO,
    MAKER,
    AAVEV3,
    UNIV3,
    SPARK,
    MORPHO_BLUE,
    CURVEUSD,
    BALANCER_V3
}
```
