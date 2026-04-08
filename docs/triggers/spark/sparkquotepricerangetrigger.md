---
icon: sparkles
---

# SparkQuotePriceRangeTrigger

### Description

Trigger contract that verifies if current token price ratio is outside of given range specified during subscription

> **Notes**
>
> The contract computes the base/quote ratio by dividing the oracle prices of the two tokens. The trigger expects the lowerPrice and upperPrice inputs to be scaled by 1e8. It is possible to check only one side of the range by setting the other side price to 0. Checks Spark V3 oracle for current prices and triggers if it's in a correct state

### Trigger ID

`0x83a50237`

### SDK Action

```ts
const sparkQuotePriceRangeTrigger = new dfs.triggers.SparkQuotePriceRangeTrigger(
    baseTokenAddr,
    quoteTokenAddr,
    lowerPrice,
    upperPrice,
);
```

### Subscription Parameters

```solidity
/// @param baseTokenAddr address of the base token which is quoted
/// @param quoteTokenAddr address of the quote token
/// @param lowerPrice lower price of the base token in terms of the quote token that represents the triggerable point.
/// @param upperPrice upper price of the base token in terms of the quote token that represents the triggerable point.
struct SubParams {
    address baseTokenAddr;
    address quoteTokenAddr;
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
