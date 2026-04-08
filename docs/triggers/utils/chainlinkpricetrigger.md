---
icon: hammer
---

# ChainlinkPriceTrigger

### Description

Trigger contract that verifies if current token price is over/under the price specified during subscription

> **Notes**
>
> If there's no chainlink oracle available for the token, price will be fetched from AaveV2, Spark and AaveV3 (in that order). Checks chainlink oracle for current price and triggers if it's in a correct state.

### Trigger ID

`0xac6bb72a`

### SDK Action

```ts
const chainLinkPriceTrigger = new dfs.triggers.ChainLinkPriceTrigger(
    tokenAddr,
    price,
    state
);
```

### Subscription Parameters

```solidity
/// @param tokenAddr address of the token which price we trigger with
/// @param price price in USD of the token that represents the triggerable point
/// @param state represents if we want the current price to be higher or lower than price param
struct SubParams {
    address tokenAddr;
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
