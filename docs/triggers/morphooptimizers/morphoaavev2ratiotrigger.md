---
icon: bluesky
---

# MorphoAaveV2RatioTrigger

### Description

Trigger that triggers when the ratio of a user's position in a Morpho AaveV2 market is over or under a certain ratio.

### Trigger ID

`0x429242d7`

### SDK Action

```ts
const morphoAaveV2RatioTrigger = new dfs.triggers.MorphoAaveV2RatioTrigger(
    user,
    ratio,
    state
);
```

### Subscription Parameters

```solidity
/// @param user address of the user whose position we check
/// @param ratio ratio that represents the triggerable point
/// @param state represents if we want the current state to be higher or lower than ratio param
struct SubParams {
    address user;
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
