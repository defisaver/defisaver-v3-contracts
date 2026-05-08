# ➿ CurveUsdCreate

### Description

Action that creates a curveusd position on behalf of user's wallet

### Action ID

`0x269ac704`

### SDK Action

```ts
const curveUsdCreateAction = new dfs.actions.curveusd.CurveUsdCreateAction(
    controllerAddress,
    from,
    to,
    collateralAmount,
    debtAmount,
    nBands
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param controllerAddress Address of the curveusd market controller
    /// @param from Address from which to pull collateral asset, will default to user's wallet
    /// @param to Address that will receive the borrowed crvUSD, will default to user's wallet
    /// @param collateralAmount Amount of collateral asset to supply
    /// @param debtAmount Amount of crvUSD to borrow (does not support uint.max)
    /// @param nBands Number of bands in which the collateral will be supplied
    struct Params {
        address controllerAddress;
        address from;
        address to;
        uint256 collateralAmount;
        uint256 debtAmount;
        uint256 nBands;
    }
```

### Return Value

```solidity
return bytes32(generatedAmount);
```

### Events and Logs

```solidity
emit ActionEvent("CurveUsdCreate", logData);
logger.logActionDirectEvent("CurveUsdCreate", logData);
bytes memory logData = abi.encode(params);
```
