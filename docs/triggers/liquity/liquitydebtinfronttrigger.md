---
description: Checks if total amount of debt in front of a specified trove is over a limit
icon: droplet
---

# LiquityDebtInFrontTrigger

### Description

Checks if total amount of debt in front of a specified trove is over a limit

### Trigger ID

`0xff4a5c51`

### SDK Action

```ts
const liquityDebtInFrontTrigger = new dfs.triggers.LiquityDebtInFrontTrigger(
    ...args
);
```

### Subscription Parameters

```solidity
/// @param troveOwner Trove is based on user address so we use trove owner addr
/// @param debtInFrontMin Minimal amount of debtInFront that is required
struct SubParams {
    address troveOwner;
    uint256 debtInFrontMin;
}
```

### Calldata Parameters

```solidity
None
```

### IsChangeable

`false`
