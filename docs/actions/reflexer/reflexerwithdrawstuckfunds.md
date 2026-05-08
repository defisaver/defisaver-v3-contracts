---
icon: reflect-horizontal
---

# ReflexerWithdrawStuckFunds

### Description

Withdraws stuck rai from a Reflexer safe

> **Notes**
>
> Only owner of the safe can withdraw funds Withdraws stuck funds from the safe

### Action ID

`0x20ee2a2a`

### SDK Action

```ts
const reflexerWithdrawStuckFundsAction = new dfs.actions.reflexer.ReflexerWithdrawStuckFunds(
    safeId,
    to
);

```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param safeId Id of the reflexer safe
    /// @param to Address where to send stuck rai tokens
    struct Params {
        uint256 safeId;
        address to;
    }
```

### Return Value

```solidity
return bytes32(withdrawnAmount);
```

### Events and Logs

```solidity
emit ActionEvent("ReflexerWithdrawStuckFunds", logData);
logger.logActionDirectEvent("ReflexerWithdrawStuckFunds", logData);
bytes memory logData = abi.encode(params);
```
