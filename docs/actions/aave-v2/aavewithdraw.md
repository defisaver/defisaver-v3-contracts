---
description: Withdraw a token from an AaveV2 market.
icon: ghost
---

# AaveWithdraw

### Description

Withdraw a token from an Aave market

> **Notes**
>
> User withdraws tokens from the Aave protocol

### Action ID

`0x4a76aaa3`

### SDK Action

```ts
const aaveWithdrawAction = new dfs.actions.aave.AaveWithdrawAction(
    market,
    tokenAddr,
    amount,
    to
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param market Aave Market address.
    /// @param tokenAddr Token address.
    /// @param amount Amount of tokens to withdraw.
    /// @param to Address to send the withdrawn tokens to.
    struct Params {
        address market;
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
emit ActionEvent("AaveWithdraw", logData);
logger.logActionDirectEvent("AaveWithdraw", logData);
bytes memory logData = abi.encode(params);
```
