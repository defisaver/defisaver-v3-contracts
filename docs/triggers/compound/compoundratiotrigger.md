---
icon: building-columns
---

# CompoundRatioTrigger

### Description

Trigger contract that verifies if the Compound position went over/under the subbed ratio

### Trigger ID

`0xfd030057`

### SDK Action

```ts
const compoundRatioTrigger = new dfs.triggers.CompoundRatioTrigger(
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
