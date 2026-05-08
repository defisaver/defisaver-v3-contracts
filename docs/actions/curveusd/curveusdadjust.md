# ➿ CurveUsdAdjust

### Description

Action that supplies collateral to a curveusd position and borrows more crvUSD

### Action ID

`0xb7bc5093`

### SDK Action

```ts
const curveUsdAdjustAction = new dfs.actions.curveusd.CurveUsdAdjustAction(
    controllerAddress,
    from,
    to,
    supplyAmount,
    borrowAmount
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param controllerAddress Address of the curveusd market controller
    /// @param from Address from which to pull collateral asset, will default to user's wallet
    /// @param to Address which will receive borrowed crvUSD
    /// @param supplyAmount Amount of collateral asset to supply (uint.max supported)
    /// @param borrowAmount Amount of debt asset to borrow (uint.max not supported)
    struct Params {
        address controllerAddress;
        address from;
        address to;
        uint256 supplyAmount;
        uint256 borrowAmount;
    }
```

### Return Value

```solidity
return bytes32(borrowedAmount);
```

### Events and Logs

```solidity
emit ActionEvent("CurveUsdAdjust", logData);
logger.logActionDirectEvent("CurveUsdAdjust", logData);
bytes memory logData = abi.encode(params);
```
