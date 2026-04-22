---
icon: sparkles
---

# SparkSetEMode

### Description

Set positions eMode

> **Notes**
>
> User sets EMode for Spark position on user's wallet

### Action ID

`0x2fa361c3`

### SDK Action

```ts
const sparkSetEModeAction = new dfs.actions.spark.SparkSetEModeAction(
    useOnDefaultMarket,
    market,
    categoryId
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param categoryId eMode category id (0 - 255)
    /// @param useDefaultMarket Whether to use the default market
    /// @param market Address of the market to set the eMode for
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
emit ActionEvent("SparkSetEMode", logData);
logger.logActionDirectEvent("SparkSetEMode", logData);
bytes memory logData = abi.encode(params);
```
