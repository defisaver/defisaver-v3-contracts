---
icon: hammer
---

# GasPriceTrigger

### Description

Trigger contract that verifies if the current gas price of tx is lower than the max allowed gas price

### Trigger ID

`0x020a2a1f`

### SDK Action

```ts
const gasPriceTrigger = new dfs.triggers.GasPriceTrigger(
    maxGasPrice
);
```

### Subscription Parameters

```solidity
/// @param maxGasPrice max gas price that represents the triggerable point
struct SubParams {
    uint256 maxGasPrice;
}
```

### Calldata Parameters

```solidity
None
```

### IsChangeable

`false`
