---
icon: droplet
---

# LiquityRatioTrigger

### Description

Trigger contract that verifies if current Liquity position ratio went over/under the subbed ratio

### Trigger ID

`0x26ef9c60`

### SDK Action

```ts
const liquityRatioTrigger = new dfs.triggers.LiquityRatioTrigger(
    troveOwner,
    ratio,
    state
);
```

### Subscription Parameters

```solidity
/// @param troveOwner address of the user whose position we check
/// @param ratio ratio that represents the triggerable point
/// @param state represents if we want the current state to be higher or lower than ratio param
struct SubParams {
    address troveOwner;
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
