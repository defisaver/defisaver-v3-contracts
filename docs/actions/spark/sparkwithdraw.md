---
icon: sparkles
---

# SparkWithdraw

### Description

Withdraw a token from an Spark market

> **Notes**
>
> User withdraws tokens from the Spark protocol

### Action ID

`0xe9d31142`

### SDK Action

```ts
const sparkWithdrawAction = new dfs.actions.spark.SparkWithdrawAction(
    useDefaultMarket,
    market,
    amount,
    to,
    assetId
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param assetId The id of the token to be withdrawn
    /// @param useDefaultMarket Whether to use the default market
    /// @param amount Amount of tokens to be withdrawn
    /// @param to Address to send the withdrawn tokens to
    /// @param market Address of the market to withdraw from
    struct Params {
        uint16 assetId;
        bool useDefaultMarket;
        uint256 amount;
        address to;
        address market;
    }
```

### Return Value

```solidity
return bytes32(withdrawnAmount);
```

### Events and Logs

```solidity
emit ActionEvent("SparkWithdraw", logData);
logger.logActionDirectEvent("SparkWithdraw", logData);
bytes memory logData = abi.encode(params);
```
