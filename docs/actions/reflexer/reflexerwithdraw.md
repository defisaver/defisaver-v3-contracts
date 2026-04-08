---
icon: reflect-horizontal
---

# ReflexerWithdraw

### Description

Withdraws collateral from a Reflexer safe

> **Notes**
>
> Withdraws collateral from the safe Returns all the collateral of the safe, formatted in the correct decimal Gets Safe info (collateral, debt)

### Action ID

`0x84c3e0aa`

### SDK Action

```ts
const reflexerWithdrawAction = new dfs.actions.reflexer.ReflexerWithdrawAction(
    safeId,
    amount,
    adapterAddr,
    to
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param safeId Id of the safe
    /// @param amount Amount of collateral to withdraw
    /// @param adapterAddr Adapter address of the reflexer collateral
    /// @param to Address where to send the collateral we withdrew
    struct Params {
        uint256 safeId;
        uint256 amount;
        address adapterAddr;
        address to;
    }
```

### Return Value

```solidity
return bytes32(withdrawnAmount);
```

### Events and Logs

```solidity
emit ActionEvent("ReflexerWithdraw", logData);
logger.logActionDirectEvent("ReflexerWithdraw", logData);
bytes memory logData = abi.encode(params);
```
