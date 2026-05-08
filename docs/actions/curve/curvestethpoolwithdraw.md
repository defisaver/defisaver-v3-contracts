# ➰ CurveStethPoolWithdraw

### Description

Action that withdraws tokens from the Curve steth pool

### Action ID

`0x212a9416`

### SDK Action

```ts
const curveStethPoolWithdrawAction = new dfs.actions.curve.CurveStethPoolWithdrawAction(
    from,
    to,
    amounts,
    maxBurnAmount,
    returnValue
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param from Address where to pull lp tokens from
    /// @param to Address that will receive the withdrawn tokens
    /// @param amounts Amount of each token to withdraw
    /// @param maxBurnAmount Max amount of LP tokens to burn
    /// @param returnValue Type of token to return (WETH, STETH, LP)
    struct Params {
        address from;
        address to;
        uint256[2] amounts;
        uint256 maxBurnAmount;
        ReturnValue returnValue;
    }
```

### Return Value

```solidity
return (WETH, STETH, LP)
    struct Params {
        address from;
```

### Events and Logs

```solidity
emit ActionEvent("CurveStethPoolWithdraw", logData);
logger.logActionDirectEvent("CurveStethPoolWithdraw", logData);
bytes memory logData = abi.encode(params);
```
