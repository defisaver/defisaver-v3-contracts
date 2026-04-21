---
icon: sparkles
---

# SparkSupply

### Description

Supply a token to an Spark market

> **Notes**
>
> User deposits tokens to the Spark protocol

### Action ID

`0x92e0c47c`

### SDK Action

```ts
const sparkSupplyAction = new dfs.actions.spark.SparkSupplyAction(
    useDefaultMarket,
    market,
    amount,
    from,
    tokenAddress,
    assetId,
    enableAsColl,
    useOnBehalf,
    onBehalf
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param amount Amount of tokens to supply
    /// @param from Address to pull the supply tokens from
    /// @param assetId The id of the token to be supplied
    /// @param enableAsColl Whether to enable the asset as collateral
    /// @param useDefaultMarket Whether to use the default market
    /// @param useOnBehalf Whether to supply on behalf of another address
    /// @param market Address of the market to supply to
    struct Params {
        uint256 amount;
        address from;
        uint16 assetId;
        bool enableAsColl;
        bool useDefaultMarket;
        bool useOnBehalf;
        address market;
        address onBehalf;
    }
```

### Return Value

```solidity
return bytes32(supplyAmount);
```

### Events and Logs

```solidity
emit ActionEvent("SparkSupply", logData);
logger.logActionDirectEvent("SparkSupply", logData);
bytes memory logData = abi.encode(params);
```
