---
icon: droplet
---

# LiquityV2QuotePriceTrigger

### Description

Trigger contract that verifies if price of collateral on a chosen LiquityV2 market went over or under a certain threshold

### Trigger ID

`0xbde64ad9`

### SDK Action

```ts
const liquityV2QuotePriceTrigger = new dfs.triggers.LiquityV2QuotePriceTrigger(
    market,
    price,
    state
);
```

### Subscription Parameters

```solidity
/// @param market address of the market where the trove is
/// @param price threshold price that represents the triggerable point
/// @param state represents if we want the current state to be higher or lower than ratio param
struct SubParams {
    address market;
    uint256 price;
    uint8 state;
}
```

### Calldata Parameters

```solidity
None
```

### IsChangeable

`false`
