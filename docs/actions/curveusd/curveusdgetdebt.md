# ➿ CurveUsdGetDebt

### Description

Action that returns users crvusd debt on a given market

### Action ID

`0xc914b767`

### SDK Action

```ts
const curveUsdGetDebtAction = new dfs.actions.curveusd.CurveUsdGetDebtAction(
    controllerAddr,
    debtor
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param controllerAddress Address of the curveusd market controller
    /// @param debtor Address which owns the curveusd position
    struct Params {
        address controllerAddress;
        address debtor;
    }
```

### Return Value

```solidity
return bytes32(debt);
```

### Events and Logs

```solidity
```
