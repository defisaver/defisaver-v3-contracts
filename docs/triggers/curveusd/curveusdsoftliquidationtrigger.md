# ➿ CurveUsdSoftLiquidationTrigger

### Description

Trigger that triggers when a user is in, or %percentage away from soft liquidation

> **Notes**
>
> Checks if user is in, or %percentage away from soft liquidation If the user is fully soft liquidated "percentage" is ignored and returns false

### Trigger ID

`0x7ff68c12`

### SDK Action

```ts
const curveUsdSoftLiquidationTrigger = new dfs.triggers.CurveUsdSoftLiquidationTrigger(
    ...args
);
```

### Subscription Parameters

```solidity
/// @param market - CurveUsd market
/// @param user - Address of the position owner
/// @param percentage - Price percentage threshold for triggering before soft liquidation
struct SubParams {
    address market;
    address user;
    uint256 percentage;
}
```

### Calldata Parameters

```solidity
None
```

### IsChangeable

`false`
