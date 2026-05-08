---
icon: building-columns
---

# CompoundV3RatioTrigger

### Description

Trigger contract that verifies if the CompoundV3 position went over/under the subbed ratio

> **Notes**
>
> Checks current safety ratio of a CompoundV3 position and triggers if it's in a correct state.

### Trigger ID

`0x506812d0`

### SDK Action

```ts
const compV3RatioTrigger = new dfs.triggers.CompV3RatioTrigger(
    user,
    market,
    ratio,
    state
);
```

### Subscription Parameters

```solidity
/// @param user address of the user whose position we check
/// @param _market Main Comet proxy contract that is different for each compound market
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
