---
icon: baseball
---

# RenzoStake

### Description

Supplies ETH (action receives WETH) to Renzo for ETH2 Staking. Receives ezETH in return

> **Notes**
>
> This action:
>
> 1. Pulls weth
> 2. Transforms it into eth
> 3. Stakes it with Renzo
> 4. Receives ezETH
> 5. Sends tokens to target address

### Action ID

`0xde82f951`

### SDK Action

```ts
const renzoStakeAction = new dfs.actions.renzo.RenzoStakeAction(
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
    /// @param to - address where received ezETH will be sent to
    struct Params {
        uint256 amount;
        address from;
        address to;
    }
```

### Return Value

```solidity
    return bytes32(ezEthReceivedAmount);
```

### Events and Logs

```solidity
emit ActionEvent("RenzoStake", logData);
logger.logActionDirectEvent("RenzoStake", logData);
bytes memory logData = abi.encode(params);
```
