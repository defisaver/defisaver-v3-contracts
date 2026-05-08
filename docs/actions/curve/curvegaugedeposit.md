# ➰ CurveGaugeDeposit

### Description

Action that deposits LP tokens into a Liquidity Gauge.

> **Notes**
>
> if \_params.receiver != address(this) the receiver must call set\_approve\_deposit on gauge

### Action ID

`0x728abd4c`

### SDK Action

```ts
const curveGaugeDepositAction = new dfs.actions.curve.CurveGaugeDepositAction(
    gaugeAddr,
    lpToken,
    sender,
    onBehalfOf,
    amount
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param gaugeAddr Address of the gauge to deposit into
    /// @param lpToken Address of the LP token to deposit
    /// @param sender Address where the LP tokens are pulled from
    /// @param onBehalfOf Address of the deposit beneficiary
    /// @param amount Amount of LP tokens to deposit
    struct Params {
        address gaugeAddr;
        address lpToken;
        address sender;
        address onBehalfOf;
        uint256 amount;
    }
```

### Return Value

```solidity
return bytes32(deposited);
```

### Events and Logs

```solidity
emit ActionEvent("CurveGaugeDeposit", logData);
logger.logActionDirectEvent("CurveGaugeDeposit", logData);
bytes memory logData = abi.encode(params);
```
