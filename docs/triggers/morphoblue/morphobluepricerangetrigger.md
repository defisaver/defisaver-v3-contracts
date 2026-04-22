---
icon: butterfly
---

# MorphoBluePriceRangeTrigger

### Description

Trigger contract that verifies if current token price ratio is outside of given range specified during subscription.

> **Notes**
>
> This uses the Morpho oracle, which returns the price of the collateral token in terms of the loan token. The trigger expects the price inputs to be scaled by 1e8. It is possible to check only one side of the range by setting the other side price to 0.

### Trigger ID

`0x23825034`

### SDK Action

```ts
const morphoBluePriceRangeTrigger = new dfs.triggers.MorphoBluePriceRangeTrigger(
    oracle,
    collateralToken,
    loanToken,
    lowerPrice,
    upperPrice
);
```

### Subscription Parameters

```solidity
/// @param oracle address of the morpho oracle from the market
/// @param collateralToken address of the collateral token from the market
/// @param loanToken address of the loan token from the market
/// @param lowerPrice lower price of the collateral token in terms of the loan token that represents the triggerable point.
/// @param upperPrice upper price of the collateral token in terms of the loan token that represents the triggerable point.
struct SubParams {
    address oracle;
    address collateralToken;
    address loanToken;
    uint256 lowerPrice;
    uint256 upperPrice;
}
```

### Calldata Parameters

```solidity
None
```

### IsChangeable

`false`
