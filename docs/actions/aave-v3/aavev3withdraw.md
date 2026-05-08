---
icon: ghost
---

# AaveV3Withdraw

### Description

Withdraw a token from an Aave market

> **Notes**
>
> User withdraws tokens from the Aave protocol. Send type(uint).max to withdraw whole amount.

### Action ID

`0x72a6498a`

### SDK Action

```ts
const aaveV3WithdrawAction = new dfs.actions.aaveV3.AaveV3WithdrawAction(
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
    /// @param assetId Asset id.
    /// @param useDefaultMarket Whether to use the default market.
    /// @param amount Amount of tokens to withdraw.
    /// @param to Address to send the withdrawn tokens to.
    /// @param market Aave Market address.
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
emit ActionEvent("AaveV3Withdraw", logData);
logger.logActionDirectEvent("AaveV3Withdraw", logData);
bytes memory logData = abi.encode(params);
```
