---
icon: ghost
---

# AaveV3Borrow

### Description

Borrow a token from AaveV3 market

> **Notes**
>
> User borrows tokens from the Aave protocol

### Action ID

`0x9e9290b1`

### SDK Action

```ts
const aaveV3BorrowAction = new dfs.actions.aaveV3.AaveV3BorrowAction(
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
    /// @param amount Amount of tokens to borrow.
    /// @param to Address to send the borrowed tokens to.
    /// @param rateMode Rate mode.
    /// @param assetId Asset id.
    /// @param useDefaultMarket Whether to use the default market.
    /// @param useOnBehalf Whether to use on behalf.
    /// @param market Aave Market address.
    /// @param onBehalf Address to send the borrowed tokens on behalf of. Defaults to the user's wallet.
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
emit ActionEvent("AaveV3Borrow", logData);
logger.logActionDirectEvent("AaveV3Borrow", logData);
bytes memory logData = abi.encode(params);
```
