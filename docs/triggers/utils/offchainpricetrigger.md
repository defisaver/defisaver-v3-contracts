---
icon: hammer
---

# OffchainPriceTrigger

### Description

Trigger that triggers when the price of a token is over or under a limit price.

### Trigger ID

`0x3ef9c07c`

### SDK Action

```ts
const offchainPriceTrigger = new dfs.triggers.OffchainPriceTrigger(
    limitPrice,
    limitType
);
```

### Subscription Parameters

```solidity
/// @param limitPrice limit price that represents the triggerable point
/// @param goodUntilTimestamp timestamp until which the trigger is valid
/// @param orderType type of the order (TAKE_PROFIT or STOP_LOSS)
struct SubParams {
    uint256 limitPrice;
    uint256 goodUntilTimestamp;
    OrderType orderType;
}
```

### Calldata Parameters

```solidity
struct CallParams {
    uint256 currentPrice;
}
```

### IsChangeable

`false`
