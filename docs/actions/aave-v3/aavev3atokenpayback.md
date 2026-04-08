---
icon: ghost
---

# AaveV3ATokenPayback

### Description

Allows a user to repay with aTokens of the underlying debt asset eg. Pay DAI debt using aDAI tokens. This is a L2 specific action which has `executeActionDirectL2()` where a tightly packed data is sent.

> **Notes**
>
> User needs to approve its wallet to pull aTokens.\
> If amount bigger than the current debt is sent just the max. debt amount will be pulled/paid.

### Action ID

`0x62c722e3`

### SDK Action

```ts
const aaveV3ATokenPaybackAction = new dfs.actions.aaveV3.AaveV3ATokenPaybackAction(
    useDefaultMarket,
    market,
    amount,
    from,
    rateMode,
    aTokenAddr,
    assetId
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
    /// @param market Aave Market address.
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
emit ActionEvent("AaveV3ATokenPayback", logData);
logger.logActionDirectEvent("AaveV3ATokenPayback", logData);
bytes memory logData = abi.encode(params);
```
