---
icon: bluesky
---

# MorphoBlueRatioTrigger

### Description

Trigger contract that verifies if the MorphoBlue position went over/under the subbed ratio

### Trigger ID

`0x98c39012`

### SDK Action

```ts
const morphoBlueRatioTrigger = new dfs.triggers.MorphoBlueRatioTrigger(
    marketId,
    user,
    ratio,
    state
);
```

### Subscription Parameters

```solidity
/// @param marketId bytes32 representing a MorphoBlue market
/// @param user address of the user whose position we check
/// @param ratio ratio that represents the triggerable point
/// @param state represents if we want the current state to be higher or lower than ratio param
struct SubParams {
    Id marketId; // this is bytes32
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
