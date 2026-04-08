---
icon: hammer
---

# ClosePriceTrigger

### Description

Trigger contract that verifies if the current price of token is outside of given range

> **Notes**
>
> Checks chainlink oracle for current price and triggers if it's outside lower-upper price range

### Trigger ID

`0x460375de`

### SDK Action

```ts
const closePriceTrigger = new dfs.triggers.ClosePriceTrigger(
    token,
    lowerPrice,
    upperPrice
);
```

### Subscription Parameters

```solidity
/// @param tokenAddr address of the token
/// @param lowerPrice lower price of the token
/// @param upperPrice upper price of the token
struct SubParams {
    address tokenAddr;
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
