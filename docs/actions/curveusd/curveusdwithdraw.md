# ➿ CurveUsdWithdraw

### Description

Action that withdraws collateral from user's wallet curveusd position

> **Notes**
>
> if collateralAmount == uintMax will withdraw as much as the debt will allow

### Action ID

`0xd593ef63`

### SDK Action

```ts
const curveUsdWithdrawAction = new dfs.actions.curveusd.CurveUsdWithdrawAction(
    controllerAddress,
    to,
    collateralAmount
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param controllerAddress Address of the curveusd market controller
    /// @param to Address that will receive the withdrawn collateral, will default to user's wallet
    /// @param collateralAmount Amount of collateral to withdraw
    struct Params {
        address controllerAddress;
        address to;
        uint256 collateralAmount;
    }
```

### Return Value

```solidity
return bytes32(generatedAmount);
```

### Events and Logs

```solidity
emit ActionEvent("CurveUsdWithdraw", logData);
logger.logActionDirectEvent("CurveUsdWithdraw", logData);
bytes memory logData = abi.encode(params);
```
