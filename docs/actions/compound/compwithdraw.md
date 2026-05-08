---
icon: building-columns
---

# CompWithdraw

### Description

Withdraw a token from Compound.

> **Notes**
>
> Withdraws a underlying token amount from compound

### Action ID

`0x2e897428`

### SDK Action

```ts
const compoundWithdrawAction = new dfs.actions.compound.CompoundWithdrawAction(
    cTokenAddr,
    amount,
    to
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param cTokenAddr Address of the cToken token to withdraw
    /// @param amount Amount of tokens to be withdrawn
    /// @param to Address that will receive the withdrawn tokens
    struct Params {
        address cTokenAddr;
        uint256 amount;
        address to;
    }
```

### Return Value

```solidity
return bytes32(withdrawAmount);
```

### Events and Logs

```solidity
emit ActionEvent("CompWithdraw", logData);
logger.logActionDirectEvent("CompWithdraw", logData);
bytes memory logData = abi.encode(params);
```
