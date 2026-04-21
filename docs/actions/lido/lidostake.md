---
icon: l
---

# LidoStake

### Description

Supplies ETH (action receives WETH) to Lido for ETH2 Staking. Receives stETH in return

> **Notes**
>
> Pulls weth, transforms it into eth, stakes it with lido, receives stEth and sends it to target address.\
> Receiving address may find itself with 1-2 less wei than amount sent (received from staking) due to lido rounding error.

### Action ID

`0xd7e40b2d`

### SDK Action

```ts
const lidoStakeAction = new dfs.actions.lido.LidoStakeAction(
    amount,
    from,
    to
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param amount - amount of WETH to pull
    /// @param from - address from which to pull WETH from
    /// @param to - address where received stETH will be sent to
    struct Params {
        uint256 amount;
        address from;
        address to;
    }
```

### Return Value

```solidity
return
contract LidoStake is ActionBase, DSMath, LidoHelper {
    using TokenUtils for address;
```

### Events and Logs

```solidity
emit ActionEvent("LidoStake", logData);
logger.logActionDirectEvent("LidoStake", logData);
bytes memory logData = abi.encode(params);
```
