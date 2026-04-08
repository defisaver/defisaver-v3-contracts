---
icon: reflect-horizontal
---

# ReflexerRatioTrigger

### Description

Trigger contract that verifies if the Reflexer position went over/under the subbed ratio

### Trigger ID

`0xbdf0c263`

### SDK Action

```ts
const reflexerRatioTrigger = new dfs.triggers.ReflexerRatioTrigger(
    vaultId,
    ratio,
    state
);
```

### Subscription Parameters

```solidity
/// @param safeId Reflexer vault Id that we want to check
/// @param ratio ratio that represents the triggerable point
/// @param state represents if we want the current state to be higher or lower than ratio param
struct SubParams {
    uint256 safeId;
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
