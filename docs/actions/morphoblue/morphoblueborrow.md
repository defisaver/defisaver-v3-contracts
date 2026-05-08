---
icon: bluesky
---

# MorphoBlueBorrow

### Description

Borrow a token from a Morpho Blue market

### Action ID

`0xf82d8814`

### SDK Action

```ts
const morphoBlueBorrowAction = new dfs.actions.morpho-blue.MorphoBlueBorrowAction(
    loanToken,
    collateralToken,
    oracle,
    irm,
    lltv,
    borrowAmount,
    onBehalf,
    to
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param marketParams Market params of specified Morpho Blue market
    /// @param borrowAmount The amount of assets to borrow
    /// @param onBehalf The address that owns the position whose debt will increase
    /// @param to The Address which will receive tokens borrowed
    struct Params {
        MarketParams marketParams;
        uint256 borrowAmount;
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
emit ActionEvent("MorphoBlueBorrow", logData);
logger.logActionDirectEvent("MorphoBlueBorrow", logData);
bytes memory logData = abi.encode(params);
```
