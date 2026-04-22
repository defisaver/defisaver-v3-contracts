---
icon: building-columns
---

# CompV3PriceRangeTrigger

### Description

Trigger contract that verifies if current token price ratio is outside of given range specified during subscription

> **Notes**
>
> This uses the CompoundV3 oracle, which returns the price of the collateral token in terms of the base (debt) token. The trigger expects the lowerPrice and upperPrice inputs to be scaled by 1e8. It is possible to check only one side of the range by setting the other side price to 0.

### Trigger ID

`0xe4cdaef5`

### SDK Action

```ts
const compV3PriceRangeTrigger = new dfs.triggers.CompV3PriceRangeTrigger(
    market,
    collToken,
    lowerPrice,
    upperPrice
);
```

### Subscription Parameters

```solidity
/// @param market address of the compoundV3 market
/// @param collToken address of the collateral token from the market
/// @param lowerPrice lower price of the collateral token in terms of the base token that represents the triggerable point.
/// @param upperPrice upper price of the collateral token in terms of the base token that represents the triggerable point.
struct SubParams {
    address market;
    address collToken;
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
