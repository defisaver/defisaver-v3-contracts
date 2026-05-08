---
icon: wave
---

# FluidRatioTrigger

### Description

Trigger contract that verifies if current fluid position ratio went over/under the subbed ratio

### Trigger ID

`0x6de6c127`

### SDK Action

```ts
const fluidRatioTrigger = new dfs.triggers.FluidRatioTrigger(
    nftId,
    ratio,
    state
);
```

### Subscription Parameters

```solidity
/// @param nftId nft id of the fluid position
/// @param ratio ratio that represents the triggerable point
/// @param state represents if we want the current state to be higher or lower than ratio param
struct SubParams {
    uint256 nftId;
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
