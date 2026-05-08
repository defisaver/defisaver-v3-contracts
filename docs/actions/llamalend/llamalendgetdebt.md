---
icon: rainbow
---

# LlamaLendGetDebt

### Description

Action that returns users llamalend debt on a given market

### Action ID

`0x389418e6`

### SDK Action

```ts
const llamaLendGetDebtAction = new dfs.actions.llamalend.LlamaLendGetDebtAction(
    controllerAddr,
    debtor
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param controllerAddress Address of the llamalend market controller
    /// @param debtor Address which owns the llamalend position
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
