# ➰ CurveGaugeWithdraw

### Description

Action that withdraws LP tokens from a Liquidity Gauge.

### Action ID

`0x8240bdb7`

### SDK Action

```ts
const curveGaugeWithdrawAction = new dfs.actions.curve.CurveGaugeWithdrawAction(
    gaugeAddr,
    lpToken,
    receiver,
    amount
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param gaugeAddr Address of the gauge to withdraw from
    /// @param lpToken Address of the LP token to withdraw
    /// @param receiver Address that will receive the withdrawn tokens
    /// @param amount Amount of LP tokens to withdraw
    struct Params {
        address gaugeAddr;
        address lpToken;
        address receiver;
        uint256 amount;
    }
```

### Return Value

```solidity
return bytes32(withdrawn);
```

### Events and Logs

```solidity
emit ActionEvent("CurveGaugeWithdraw", logData);
logger.logActionDirectEvent("CurveGaugeWithdraw", logData);
bytes memory logData = abi.encode(params);
```
