---
icon: pegasus
---

# UniSupply

### Description

Supplies liquidity to uniswapV2

> **Notes**
>
> Adds liquidity to uniswap and sends lp tokens and returns to \_to.
>
> Uni markets can move, so extra tokens are expected to be left and are send to \_to.
>
> If amountADesired or AmountBDesired is uint.max whole \_from token balance is pulled.

### Action ID

`0x834ebcf7`

### SDK Action

```ts
const uniswapSupplyAction = new dfs.actions.uniswap.UniswapSupplyAction(
    tokenA,
    tokenB,
    from,
    to,
    amountADesired,
    amountBDesired,
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
emit ActionEvent("UniSupply", logData);
logger.logActionDirectEvent("UniSupply", logData);
bytes memory logData = abi.encode(params);
```
