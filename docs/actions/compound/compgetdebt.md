---
icon: building-columns
---

# CompGetDebt

### Description

Action that gets debt amount for a single asset on Compound for debtor.

### Action ID

`0xc6b0ab0c`

### SDK Action

```ts
const compoundGetDebtAction = new dfs.actions.compound.CompoundGetDebtAction(
    cTokenAddr,
    holderAddr
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param cTokenAddr Address of the cToken token to get the debt for
    /// @param debtorAddr Address of the debtor
    struct Params {
        address cTokenAddr;
        address debtorAddr;
    }
```

### Return Value

```solidity
return bytes32(debtAmount);
```

### Events and Logs

```solidity
```
