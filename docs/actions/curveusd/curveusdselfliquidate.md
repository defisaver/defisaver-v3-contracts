# ➿ CurveUsdSelfLiquidate

### Description

CurveUsdSelfLiquidate Closes the users position while he's in soft liquidation

### Action ID

`0x77f22040`

### SDK Action

```ts
const curveUsdSelfLiquidateAction = new dfs.actions.curveusd.CurveUsdSelfLiquidateAction(
    controllerAddress,
    minCrvUsdExpected,
    from,
    to
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param controllerAddress Address of the curveusd market controller
    /// @param minCrvUsdExpected Minimum amount of crvUsd as collateral for the user to have
    /// @param from Address from which to pull crvUSD if needed
    /// @param to Address that will receive the crvUSD and collateral asset
    struct Params {
        address controllerAddress;
        uint256 minCrvUsdExpected;
        address from;
        address to;
    }
```

### Return Value

```solidity
return bytes32(amountPulled);
```

### Events and Logs

```solidity
emit ActionEvent("CurveUsdSelfLiquidate", logData);
logger.logActionDirectEvent("CurveUsdSelfLiquidate", logData);
bytes memory logData = abi.encode(params);
```
