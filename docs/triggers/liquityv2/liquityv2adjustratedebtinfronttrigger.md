---
icon: droplet
---

# LiquityV2AdjustRateDebtInFrontTrigger

### Description

> **Notes**
>
> Triggers when the calculated debt in front of a LiquityV2 trove falls below specified thresholds.
>
> Determines whether to trigger the interest rate adjustment strategy based on:
>
> * Whether the trove is eligible for interest rate adjustment (active, no batch manager, cooldown passed)
> * Whether the debt in front is below the critical or non-critical thresholds
> * Whether adjustment fees are zero (affects which threshold to use)

### Trigger ID

`0xd9aa7af4`

### SDK Action

```ts
const liquityV2AdjustRateDebtInFrontTrigger = new dfs.triggers.LiquityV2AdjustRateDebtInFrontTrigger(
    market,
    troveId,
    criticalDebtInFrontLimit,
    nonCriticalDebtInFrontLimit
);
```

### Subscription Parameters

```solidity
/// @notice Parameters for the LiquityV2 interest rate adjustment trigger
/// @param market Address of the LiquityV2 market (branch) to monitor
/// @param troveId ID of the trove to monitor for debt in front
/// @param criticalDebtInFrontLimit Critical threshold - strategy executes when debt in front is below this limit
/// @param nonCriticalDebtInFrontLimit Non-critical threshold - strategy executes when debt in front is below this limit AND adjustment fee is zero
struct SubParams {
    address market;
    uint256 troveId;
    uint256 criticalDebtInFrontLimit;
    uint256 nonCriticalDebtInFrontLimit;
}
```

### Calldata Parameters

```solidity
None
```

### IsChangeable

`false`
