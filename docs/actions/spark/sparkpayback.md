---
icon: sparkles
---

# SparkPayback

### Description

Payback a token a user borrowed from an Spark market

> **Notes**
>
> User paybacks tokens to the Spark protocol

### Action ID

`0x5b717c1d`

### SDK Action

```ts
const sparkPaybackAction = new dfs.actions.spark.SparkPaybackAction(
    useOnDefaultMarket,
    market,
    amount,
    from,
    rateMode,
    tokenAddress,
    assetId,
    useOnBehalf,
    onBehalf
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param amount Amount of tokens to payback
    /// @param from Address to pull the payback tokens from
    /// @param rateMode Type of borrow debt [Stable: 1, Variable: 2]
    /// @param assetId The id of the token to be repaid
    /// @param useDefaultMarket Whether to use the default market
    /// @param useOnBehalf Whether to payback on behalf of another address
    /// @param market Address of the market to payback from
    struct Params {
        uint256 amount;
        address from;
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
return bytes32(paybackAmount);
```

### Events and Logs

```solidity
emit ActionEvent("SparkPayback", logData);
logger.logActionDirectEvent("SparkPayback", logData);
bytes memory logData = abi.encode(params);
```
