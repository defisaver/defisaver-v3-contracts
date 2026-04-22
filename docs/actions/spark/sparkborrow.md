---
icon: sparkles
---

# SparkBorrow

### Description

Borrow a token from Spark market

> **Notes**
>
> User borrows tokens from the Spark protocol

### Action ID

`0x9bc097ab`

### SDK Action

```ts
const sparkBorrowAction = new dfs.actions.spark.SparkBorrowAction(
    useDefaultMarket,
    market,
    amount,
    to,
    rateMode,
    assetId,
    useOnBehalf,
    onBehalf
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param amount Amount of tokens to borrow
    /// @param to Address to send the borrowed tokens to
    /// @param rateMode Type of borrow debt [Stable: 1, Variable: 2]
    /// @param assetId The id of the token to be borrowed
    /// @param useDefaultMarket Whether to use the default market
    /// @param useOnBehalf Whether to borrow on behalf of another address
    /// @param market Address of the market to borrow from
    /// @param onBehalf Address to borrow on behalf of
    struct Params {
        uint256 amount;
        address to;
        uint8 rateMode;
        uint16 assetId;
        bool useDefaultMarket;
        bool useOnBehalf;
        address market;
        address onBehalf;
    }
```

### Return Value

```solidity
return bytes32(borrowAmount);
```

### Events and Logs

```solidity
emit ActionEvent("SparkBorrow", logData);
logger.logActionDirectEvent("SparkBorrow", logData);
bytes memory logData = abi.encode(params);
```
