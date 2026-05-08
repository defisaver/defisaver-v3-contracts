---
icon: sparkles
---

# SparkSpTokenPayback

### Description

Allows user to repay with spTokens of the underlying debt asset eg. Pay DAI debt using spDAI tokens.

> **Notes**
>
> Allows user to repay with spTokens of the underlying debt asset eg. Pay DAI debt using spDAI tokens.

### Action ID

`0xe673c4c4`

### SDK Action

```ts
const sparkSpTokenPaybackAction = new dfs.actions.spark.SparkSpTokenPaybackAction(
    useDefaultMarket,
    market,
    amount,
    from,
    rateMode,
    spTokenAddr,
    assetId
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
    /// @param market Address of the market to payback from
    struct Params {
        uint256 amount;
        address from;
        uint8 rateMode;
        uint16 assetId;
        bool useDefaultMarket;
        address market;
    }
```

### Return Value

```solidity
return bytes32(paybackAmount);
```

### Events and Logs

```solidity
emit ActionEvent("SparkSpTokenPayback", logData);
logger.logActionDirectEvent("SparkSpTokenPayback", logData);
bytes memory logData = abi.encode(params);
```
