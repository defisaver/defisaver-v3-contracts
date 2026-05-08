---
icon: building-columns
---

# CompCollateralSwitch

### Description

Switch action to switch if user will use tokens for collateral on compound

### Action ID

`0x7e243d72`

### SDK Action

```ts
const compoundCollateralSwitchAction = new dfs.actions.compound.CompoundCollateralSwitchAction(
    cTokens,
    useAsCollateral
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param cTokens Array of cTokens addresses
    /// @param useAsCollateral Array of booleans to indicate if the cToken should be used as collateral
    struct Params {
        address[] cTokens;
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
