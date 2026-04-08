---
icon: ghost
---

# AaveV2RatioTrigger

### Description

Trigger that triggers when the ratio of a user's position in aaveV2 market is over or under a certain ratio

### Trigger ID

`0x7e8b6344`

### SDK Action

```ts
const aaveV2RatioTrigger = new dfs.triggers.AaveV2RatioTrigger(
    user,
    market,
    ratio,
    state
);
```

### Subscription Parameters

```solidity
/// @param user address of the user whose position we check
/// @param market aaveV2 market address
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
