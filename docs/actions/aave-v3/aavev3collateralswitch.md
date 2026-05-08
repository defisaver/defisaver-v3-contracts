---
icon: ghost
---

# AaveV3CollateralSwitch

### Description

Switch action if user wants to use tokens for collateral on aaveV3 market

### Action ID

`0xbffa4e35`

### SDK Action

```ts
const aaveV3CollateralSwitchAction = new dfs.actions.aaveV3.AaveV3CollateralSwitchAction(
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
    /// @param arrayLength Length of the array.
    /// @param useDefaultMarket Whether to use the default market.
    /// @param assetIds Asset ids.
    /// @param useAsCollateral Whether to use the tokens as collateral.
    /// @param market Aave Market address.
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
emit ActionEvent("AaveV3CollateralSwitch", logData);
logger.logActionDirectEvent("AaveV3CollateralSwitch", logData);
bytes memory logData = abi.encode(params);
```
