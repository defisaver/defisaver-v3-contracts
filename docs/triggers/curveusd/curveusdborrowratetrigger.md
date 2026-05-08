# ➿ CurveUsdBorrowRateTrigger

### Description

Trigger that triggers when the borrow rate of a CurveUsd market is over or under a certain rate.

### Trigger ID

`0x2198133a`

### SDK Action

```ts
const curveUsdBorrowRateTrigger = new dfs.triggers.CurveUsdBorrowRateTrigger(
    ...args
);
```

### Subscription Parameters

```solidity
/// @param market - CurveUsd market
/// @param targetRate - Rate that represents the triggerable point
/// @param state - Represents if we want the current state to be higher or lower than targetRate
struct SubParams {
    address market;
    uint256 targetRate;
    uint8 state;
}
```

### Calldata Parameters

```solidity
None
```

### IsChangeable

`false`
