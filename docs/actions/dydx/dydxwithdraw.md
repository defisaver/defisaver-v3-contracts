---
icon: display-chart-up
---

# DyDxWithdraw

### Description

Withdraw tokens from DyDx

> **Notes**
>
> User withdraws tokens from the DyDx protocol

### Action ID

`0x63e4c7d0`

### SDK Action

```ts
const dyDxWithdrawAction = new dfs.actions.dydx.DyDxWithdrawAction(
    tokenAddr,
    amount,
    to
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param tokenAddr Address of the token to be withdrawn
    /// @param amount Amount of tokens to be withdrawn -> send type(uint).max for whole amount
    /// @param to Where the withdrawn tokens will be sent
    struct Params {
        address tokenAddr;
        uint256 amount;
        address to;
    }
```

### Return Value

```solidity
return bytes32(withdrawnAmount);
```

### Events and Logs

```solidity
emit ActionEvent("DyDxWithdraw", logData);
logger.logActionDirectEvent("DyDxWithdraw", logData);
bytes memory logData = abi.encode(params);
```
