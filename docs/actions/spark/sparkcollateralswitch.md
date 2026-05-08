---
icon: sparkles
---

# SparkCollateralSwitch

### Description

Switch if you'll use tokens for collateral on spark for a market

### Action ID

`0x85f16e59`

### SDK Action

```ts
const sparkCollateralSwitchAction = new dfs.actions.spark.SparkCollateralSwitchAction(
    useDefaultMarket,
    market,
    arrayLength,
    assetIds,
    useAsCollateral
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param arrayLength Length of the assetIds and useAsCollateral arrays
    /// @param useDefaultMarket Whether to use the default market
    /// @param assetIds Array of asset ids
    /// @param useAsCollateral Array of booleans indicating if the asset should be used as collateral
    /// @param market Address of the market to switch collateral for
    struct Params {
        uint8 arrayLength;
        bool useDefaultMarket;
        uint16[] assetIds;
        bool[] useAsCollateral;
        address market;
    }
```

### Return Value

```solidity
return bytes32(0);
```

### Events and Logs

```solidity
emit ActionEvent("SparkCollateralSwitch", logData);
logger.logActionDirectEvent("SparkCollateralSwitch", logData);
bytes memory logData = abi.encode(params);
```
