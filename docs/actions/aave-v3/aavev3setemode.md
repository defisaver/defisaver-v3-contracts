---
icon: ghost
---

# AaveV3SetEMode

### Description

Set positions eMode on Aave v3

> **Notes**
>
> User sets EMode for Aave position on its wallet

### Action ID

`0x3d35d254`

### SDK Action

```ts
const aaveV3SetEModeAction = new dfs.actions.aaveV3.AaveV3SetEModeAction(
    useOnDefaultMarket,
    market,
    categoryId
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param categoryId eMode category id (0 - 255).
    /// @param useDefaultMarket Whether to use the default market.
    /// @param market Aave Market address.
    struct Params {
        uint8 categoryId;
        bool useDefaultMarket;
        address market;
    }
```

### Return Value

```solidity
return bytes32(categoryId);
```

### Events and Logs

```solidity
emit ActionEvent("AaveV3SetEMode", logData);
logger.logActionDirectEvent("AaveV3SetEMode", logData);
bytes memory logData = abi.encode(params);
```
