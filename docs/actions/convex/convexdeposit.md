---
icon: triangle
---

# ConvexDeposit

### Description

Action that either deposits(wraps) Curve LP into convex, stakes wrapped LP, or does both.

### Action ID

`0xd3652c91`

### SDK Action

```ts
const convexDepositAction = new dfs.actions.convex.ConvexDepositAction(
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
    /// @param from address from which to pull wrapped LP tokens if option is STAKE, otherwise LP tokens are pulled
    /// @param to address that will receive wrapped LP tokens if option is WRAP, otherwise it is the address for which to stake
    /// @param poolId curve pool id according to Convex Booster contract
    /// @param amount amount amount of tokens
    /// @param option DepositOption enum (WRAP, STAKE, WRAP_AND_STAKE)
    struct Params {
        address from;
        address to;
        uint256 poolId;
        uint256 amount;
        DepositOption option;
    }
```

### Return Value

```solidity
return bytes32(transientAmount);
```

### Events and Logs

```solidity
emit ActionEvent("ConvexDeposit", logData);
logger.logActionDirectEvent("ConvexDeposit", logData);
bytes memory logData = abi.encode(params);
```
