# ➿ CurveUsdSupply

### Description

Action that supplies collateral to a curveusd position

### Action ID

`0xd5293b35`

### SDK Action

```ts
const curveUsdSupplyAction = new dfs.actions.curveusd.CurveUsdSupplyAction(
    controllerAddress,
    from,
    onBehalfOf,
    collateralAmount
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param controllerAddress Address of the curveusd market controller
    /// @param from Address from which to pull collateral asset, will default to user's wallet
    /// @param onBehalfOf Address for which we are supplying, will default to user's wallet
    /// @param collateralAmount Amount of collateral asset to supply
    struct Params {
        address controllerAddress;
        address from;
        address onBehalfOf;
        uint256 collateralAmount;
    }
```

### Return Value

```solidity
return bytes32(suppliedAmount);
```

### Events and Logs

```solidity
emit ActionEvent("CurveUsdSupply", logData);
logger.logActionDirectEvent("CurveUsdSupply", logData);
bytes memory logData = abi.encode(params);
```
