---
icon: ethereum
---

# EtherFiStake

### Description

Supplies ETH (action receives WETH) to EtherFi for ETH2 Staking. Receives eETH in return or weETH in case of wrapping

> **Notes**
>
> ```
> This action:
> 1. Pulls weth
> 2. Transforms it into eth
> 3. Stakes it with EtherFi
> 4. Receives eETH
> 5. If shouldWrap is true, wraps eETH to weETH
> 6. Sends tokens to target address
> ```

### Action ID

`0x7104bb41`

### SDK Action

```ts
const etherFiStakeAction = new dfs.actions.etherfi.EtherFiStakeAction(
    amount,
    from,
    to,
    shouldWrap
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param amount - amount of WETH to pull
    /// @param from - address from which to pull WETH from
    /// @param to - address where received eETH will be sent to
    /// @param shouldWrap - true if received eETH should be wrapped to weETH
    struct Params {
        uint256 amount;
        address from;
        address to;
        bool shouldWrap;
    }
```

### Return Value

```solidity
return or weETH in case of wrapping
contract EtherFiStake is ActionBase, EtherFiHelper {
    using TokenUtils for address;
```

### Events and Logs

```solidity
emit ActionEvent("EtherFiStake", logData);
logger.logActionDirectEvent("EtherFiStake", logData);
bytes memory logData = abi.encode(params);
```
