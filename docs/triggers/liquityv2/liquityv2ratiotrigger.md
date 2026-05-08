---
icon: droplet
---

# LiquityV2RatioTrigger

### Description

Trigger contract that verifies if current LiquityV2 position ratio went over/under the subbed ratio

### Trigger ID

`0xc46878cd`

### SDK Action

```ts
const liquityV2RatioTrigger = new dfs.triggers.LiquityV2RatioTrigger(
    market,
    troveId,
    ratio,
    state
);
```

### Subscription Parameters

```solidity
/// @param market address of the market where the trove is
/// @param troveId id of the trove
/// @param ratio ratio that represents the triggerable point
/// @param state represents if we want the current state to be higher or lower than ratio param
struct SubParams {
    address market;
    uint256 troveId;
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
