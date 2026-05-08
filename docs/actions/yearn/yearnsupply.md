---
icon: 'y'
---

# YearnSupply

### Description

Supplies tokens to Yearn vault

> **Notes**
>
> tokens need to be approved for user's wallet to pull them (token address)

### Action ID

`0x7b4c8fad`

### SDK Action

```ts
const yearnSupplyAction = new dfs.actions.yearn.YearnSupplyAction(
    tokenAddr,
    amount,
    from,
    to
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param token - address of token to supply
    /// @param amount - amount of token to supply
    /// @param from - address from which to pull tokens from
    /// @param to - address where received yTokens will be sent to
    struct Params {
        address token;
        uint256 amount;
        address from;
        address to;
    }
```

### Return Value

```solidity
return bytes32(yAmountReceived);
```

### Events and Logs

```solidity
emit ActionEvent("YearnSupply", logData);
logger.logActionDirectEvent("YearnSupply", logData);
bytes memory logData = abi.encode(params);
```
