---
icon: building-columns
---

# CompV3PriceTrigger

### Description

Trigger contract that verifies if current token price ratio is over/under the price ratio specified during subscription

> **Notes**
>
> This uses the CompoundV3 oracle, which returns the price of the collateral token in terms of the base (debt) token. The trigger expects the price input to be scaled by 1e8. This trigger also uses the user address to temporarily store the current ratio of user's position.

### Trigger ID

`0xb67d04b5`

### SDK Action

```ts
const compV3PriceTrigger = new dfs.triggers.CompV3PriceTrigger(
    market,
    collToken,
    user,
    price,
    state
);
```

### Subscription Parameters

```solidity
/// @param market address of the compoundV3 market
/// @param collToken address of the collateral token from the market
/// @param user address of the user that will be used to store the current ratio for.
/// @param price price of the collateral token in terms of the base token that represents the triggerable point.
/// @param state represents if we want the current price to be higher or lower than price param
struct SubParams {
    address market;
    address collToken;
    address user;
    uint256 price;
    uint8 state;
}
```

### Calldata Parameters

```solidity
None
```

### IsChangeable

`false`
