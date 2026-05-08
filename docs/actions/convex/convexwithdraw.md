---
icon: triangle
---

# ConvexWithdraw

### Description

Action that either withdraws(unwraps) Curve LP from convex, unstakes wrapped LP, or does both.

### Action ID

`0x9ee73125`

### SDK Action

```ts
const convexWithdrawAction = new dfs.actions.convex.ConvexWithdrawAction(
    from,
    to,
    curveLp,
    amount,
    option
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param from address from which to pull wrapped LP tokens if option is UNWRAP,
    /// @param to address to which to withdraw wrapped LP tokens if option is UNSTAKE,
    /// @param poolId curve pool id according to Convex Booster contract
    /// @param amount amount amount of tokens
    /// @param option WithdrawOption enum (UNWRAP, UNSTAKE, UNSTAKE_AND_UNWRAP)
    struct Params {
        address from;
        address to;
        uint256 poolId;
        uint256 amount;
        WithdrawOption option;
    }
```

### Return Value

```solidity
return bytes32(transientAmount);
```

### Events and Logs

```solidity
emit ActionEvent("ConvexWithdraw", logData);
logger.logActionDirectEvent("ConvexWithdraw", logData);
bytes memory logData = abi.encode(params);
```
