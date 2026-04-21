---
icon: sparkles
---

# SparkSwapBorrowRateMode

### Description

Swaps user's wallet positions borrow rate mode between stable and variable.

### Action ID

`0xf7e49593`

### SDK Action

```ts
const sparkSwapBorrowRateModeAction = new dfs.actions.spark.SparkSwapBorrowRateModeAction(
    useDefaultMarket,
    market,
    rateMode,
    assetId
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param rateMode Type of borrow debt [Stable: 1, Variable: 2]
    /// @param assetId The id of the token to be swapped
    /// @param useDefaultMarket Whether to use the default market
    /// @param market Address of the market to swap borrow rate mode for
    struct Params {
        uint256 rateMode;
        uint16 assetId;
        bool useDefaultMarket;
        address market;
    }
```

### Return Value

```solidity
return bytes32(0);
```

### Events and Logs

```solidity
emit ActionEvent("SparkSwapBorrowRateMode", logData);
logger.logActionDirectEvent("SparkSwapBorrowRateMode", logData);
bytes memory logData = abi.encode(params);
```
