---
icon: sparkles
---

# SparkRatioTriggre

### Description

Trigger that triggers when the ratio of a user's position in a Spark market is over or under a certain ratio.

### Trigger ID

`0xbfb2ea35`

### SDK Action

```ts
const sparkRatioTrigger = new dfs.triggers.SparkRatioTrigger(
    user,
    market,
    ratio,
    state
);
```

### Subscription Parameters

```solidity
/// @param user address of the user whose position we check
/// @param market spark market address
/// @param ratio ratio that represents the triggerable point
/// @param state represents if we want the current state to be higher or lower than ratio param
struct SubParams {
    address user;
    address market;
    uint256 ratio;
    uint8 state;
}
```

### Calldata Parameters

```solidity
None
```

### IsChangeable

`false`
