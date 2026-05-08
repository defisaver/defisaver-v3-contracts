---
icon: 'y'
---

# YearnWithdraw

### Description

Burns yTokens and receive underlying tokens in return

> **Notes**
>
> yTokens need to be approved for user's wallet to pull them (yToken address)

### Action ID

`0x42b4f003`

### SDK Action

```ts
const yearnWithdrawAction = new dfs.actions.yearn.YearnWithdrawAction(
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
    /// @param yToken - address of yToken to withdraw (same as yVault address)
    /// @param yAmount - amount of yToken to withdraw
    /// @param from - address from which to pull yTokens from
    /// @param to - address where received underlying tokens will be sent to
    struct Params {
        address yToken;
        uint256 yAmount;
        address from;
        address to;
    }
```

### Return Value

```solidity
return (bytes32(amountReceived));
```

### Events and Logs

```solidity
emit ActionEvent("YearnWithdraw", logData);
logger.logActionDirectEvent("YearnWithdraw", logData);
bytes memory logData = abi.encode(params);
```

