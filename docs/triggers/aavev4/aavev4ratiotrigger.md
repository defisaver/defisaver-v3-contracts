---
icon: ghost
---

# AaveV4RatioTrigger

## Description

Trigger that triggers when the ratio of a user's position in aaveV4 spoke is over or under a certain ratio

## Trigger ID
`0xb611c174`

## SDK Action
```ts
const aaveV4RatioTrigger = new dfs.triggers.AaveV4RatioTrigger(
    user,
    spoke,
    ratio,
    state
);
```

## Subscription Parameters
```solidity
/// @param user Address of the user.
/// @param spoke Address of the aaveV4 spoke.
/// @param ratio Ratio that represents the triggerable point.
/// @param state Represents if we want the current state to be higher or lower than ratio param.
struct SubParams {
    address user;
    address spoke;
    uint256 ratio;
    uint8 state;
}
```

## Calldata Parameters
```solidity
None
```

## IsChangeable
`false`
