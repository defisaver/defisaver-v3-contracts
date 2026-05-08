---
icon: bluesky
---

# MorphoBlueWithdrawCollateral

### Description

Withdraw a token to Morpho Blue market that is collateral

### Action ID

`0x053bcb63`

### SDK Action

```ts
const morphoBlueWithdrawCollateralAction = new dfs.actions.morpho-blue.MorphoBlueWithdrawCollateralAction(
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
    /// @param withdrawAmount The amount of assets to supply.
    /// @param onBehalf The address that owns the collateral position.
    /// @param to The address that will receive the collateral assets.
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
emit ActionEvent("MorphoBlueWithdrawCollateral", logData);
logger.logActionDirectEvent("MorphoBlueWithdrawCollateral", logData);
bytes memory logData = abi.encode(params);
```
