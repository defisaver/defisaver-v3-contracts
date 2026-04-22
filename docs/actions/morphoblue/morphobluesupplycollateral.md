---
icon: bluesky
---

# MorphoBlueSupplyCollateral

### Description

Supply a token to Morpho Blue market as collateral

### Action ID

`0xc69d5942`

### SDK Action

```ts
const morphoBlueSupplyCollateralAction = new dfs.actions.morpho-blue.MorphoBlueSupplyCollateralAction(
    loanToken,
    collateralToken,
    oracle,
    irm,
    lltv,
    supplyAmount,
    from,
    onBehalf
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param marketParams Market params of specified Morpho Blue market
    /// @param supplyAmount The amount of assets to supply.
    /// @param from The Address from which to pull tokens to be supplied as collateral
    /// @param onBehalf The address that will own the increased collateral position.
    struct Params {
        MarketParams marketParams;
        uint256 supplyAmount;
        address from;
        address onBehalf;
    }
```

### Return Value

```solidity
return bytes32(amount);
```

### Events and Logs

```solidity
emit ActionEvent("MorphoBlueSupplyCollateral", logData);
logger.logActionDirectEvent("MorphoBlueSupplyCollateral", logData);
bytes memory logData = abi.encode(params);
```
