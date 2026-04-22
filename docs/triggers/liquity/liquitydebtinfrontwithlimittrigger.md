---
icon: droplet
---

# LiquityDebtInFrontWithLimitTrigger

### Description

Checks if total amount of debt in front of a specified trove is over a limit

> **Notes**
>
> Max number of troves to check is 250.

### Trigger ID

`0x72a21f97`

### SDK Action

```ts
const liquityDebtInFrontWithLimitTrigger = new dfs.triggers.LiquityDebtInFrontWithLimitTrigger(
    troveOwner,
    debtInFront
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
