---
icon: m
---

# McdRatioTrigger

### Description

Trigger contract that verifies if current MCD vault ratio is higher or lower than wanted

### Trigger ID

`0x7984f73c`

### SDK Action

```ts
const makerRatioTrigger = new dfs.triggers.MakerRatioTrigger(
    vaultId,
    ratio,
    state
);
```

### Subscription Parameters

```solidity
/// @param vaultId id of the vault whose ratio we check
/// @param ratio ratio that represents the triggerable point
/// @param state represents if we want current ratio to be higher or lower than ratio param
struct SubParams {
    uint256 vaultId;
    uint256 ratio;
    uint8 state;
}
```

### Calldata Parameters

```solidity
/// @param nextPrice price that OSM returns as next price value
/// @param ratioCheck returns if we want the trigger to look at the current asset price, nextPrice param or both
struct CallParams {
    uint256 nextPrice;
    uint8 ratioCheck;
}
```

### IsChangeable

`false`
