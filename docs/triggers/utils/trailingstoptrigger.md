---
icon: hammer
---

# TrailingStopTrigger

### Description

Validates trailing stop, caller injects a chainlink roundId where conditions are met

> **Notes**
>
> Given the currentPrice and the maxPrice see if there diff. > than percentage

### Trigger ID

`0x818774c3`

### SDK Action

```ts
const trailingStopTrigger = new dfs.triggers.TrailingStopTrigger(
    tokenAddr,
    percentage,
    roundId
);
```

### Subscription Parameters

```solidity
/// @param tokenAddr address of the token
/// @param percentage percentage of the price that represents the triggerable point
/// @param startRoundId start round id of the token
struct SubParams {
    address tokenAddr;
    uint256 percentage;
    uint80 startRoundId;
}
```

### Calldata Parameters

```solidity
/// @param maxRoundId max round id of the token
struct CallParams {
    uint80 maxRoundId;
}
```

### IsChangeable

`false`
