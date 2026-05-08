---
icon: ghost
---

# AaveV3QuotePriceTrigger

### Description

Trigger contract that verifies if current token price ratio is over/under the price ratio specified during subscription

> **Notes**
>
> Checks chainlink oracle for current prices and triggers if it's in a correct state

### Trigger ID

`0xda3df4c8`

### SDK Action

```ts
const aaveV3QuotePriceTrigger = new dfs.triggers.AaveV3QuotePriceTrigger(
    baseTokenAddr,
    quoteTokenAddr,
    price,
    state
);
```

### Subscription Parameters

```solidity
/// @param baseTokenAddr address of the base token which is quoted
/// @param quoteTokenAddr address of the quote token
/// @param price price in quote token of the base token that represents the triggerable point
/// @param state represents if we want the current price to be higher or lower than price param
struct SubParams {
    address baseTokenAddr;
    address quoteTokenAddr;
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
