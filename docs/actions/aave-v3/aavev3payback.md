---
icon: ghost
---

# AaveV3Payback

### Description

Payback a token a user borrowed from an AaveV3 market

> **Notes**
>
> User paybacks tokens to the Aave protocol.

### Action ID

`0x17683e81`

### SDK Action

```ts
const aaveV3PaybackAction = new dfs.actions.aaveV3.AaveV3PaybackAction(
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
    /// @param amount Amount of tokens to be paid back.
    /// @param from Address to send the payback tokens from.
    /// @param rateMode Rate mode.
    /// @param assetId Asset id.
    /// @param useDefaultMarket Whether to use the default market.
    /// @param useOnBehalf Whether to use on behalf.
    /// @param market Aave Market address.
    /// @param onBehalf Address to send the payback tokens on behalf of. Defaults to the user's wallet.
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
emit ActionEvent("AaveV3Payback", logData);
logger.logActionDirectEvent("AaveV3Payback", logData);
bytes memory logData = abi.encode(params);
```
