---
icon: bluesky
---

# MorphoBluePriceTrigger

### Description

Trigger contract that verifies if current token price ratio is over/under the price ratio specified during subscription

> **Notes**
>
> This uses the Morpho oracle, which returns the price of the collateral token in terms of the loan token. The trigger expects the price input to be scaled by 1e8.

### Trigger ID

`0x6730402c`

### SDK Action

```ts
const morphoBluePriceTrigger = new dfs.triggers.MorphoBluePriceTrigger(
    loanToken,
    collateralToken,
    oracle,
    price,
    state
);
```

### Subscription Parameters

```solidity
/// @param oracle address of the morpho oracle from the market
/// @param collateralToken address of the collateral token from the market
/// @param loanToken address of the loan token from the market
/// @param price price of the collateral token in terms of the loan token that represents the triggerable point.
/// @param state represents if we want the current price to be higher or lower than price param
struct SubParams {
    address oracle;
    address collateralToken;
    address loanToken;
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
