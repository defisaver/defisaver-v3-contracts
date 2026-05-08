---
icon: bluesky
---

# MorphoBlueWithdraw

### Description

Withdraw a token from Morpho Blue market

### Action ID

`0x5e8a8984`

### SDK Action

```ts
const morphoBlueWithdrawAction = new dfs.actions.morpho-blue.MorphoBlueWithdrawAction(
    loanToken,
    collateralToken,
    oracle,
    irm,
    lltv,
    withdrawAmount,
    onBehalf,
    to
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param marketParams Market params of specified Morpho Blue market
    /// @param withdrawAmount The amount of assets to withdraw (uint.max for full balance withdrawal)
    /// @param onBehalf The address that owns the position from which the tokens will be withdrawn
    /// @param to The Address which will receive tokens withdrawn
    struct Params {
        MarketParams marketParams;
        uint256 withdrawAmount;
        address onBehalf;
        address to;
    }
```

### Return Value

```solidity
return bytes32(amount);
```

### Events and Logs

```solidity
emit ActionEvent("MorphoBlueWithdraw", logData);
logger.logActionDirectEvent("MorphoBlueWithdraw", logData);
bytes memory logData = abi.encode(params);
```
