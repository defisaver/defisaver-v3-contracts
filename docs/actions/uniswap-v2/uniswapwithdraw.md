---
icon: pegasus
---

# UniWithdraw

### Description

Withdraws liquidity from uniswap V2

> **Notes**
>
> Removes liquidity from uniswap

### Action ID

`0x3af50783`

### SDK Action

```ts
const uniswapWithdrawAction = new dfs.actions.uniswap.UniswapWithdrawAction(
    tokenA,
    tokenB,
    liquidity,
    to,
    from,
    amountAMin,
    amountBMin,
    deadline
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
```

### Return Value

```solidity
return bytes32(liqAmount);
```

### Events and Logs

```solidity
emit ActionEvent("UniWithdraw", logData);
logger.logActionDirectEvent("UniWithdraw", logData);
bytes memory logData = abi.encode(params);
```
