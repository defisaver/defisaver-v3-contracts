---
icon: ghost
---

# AaveCollateralSwitch

### Description

Switch action if user wants to use tokens for collateral on aave market

### Action ID

`0xa8af8b82`

### SDK Action

```ts
const aaveCollateralSwitchAction = new dfs.actions.aave.AaveCollateralSwitchAction(
    market,
    tokens,
    useAsCollateral
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param market Aave Market address.
    /// @param tokens Tokens to switch as collateral.
    /// @param useAsCollateral Whether to use the tokens as collateral.
    struct Params {
        address market;
        address[] tokens;
        bool[] useAsCollateral;
    }
```

### Return Value

```solidity
return bytes32(0);
```

### Events and Logs

```solidity
```
