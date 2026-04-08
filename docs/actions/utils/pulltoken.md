---
icon: hammer
---

# PullToken

### Description

Helper action to pull a token from the specified address

> **Notes**
>
> Pulls a token from the specified addr, doesn't work with raw ETH. If amount is type(uint).max it will send whole user's wallet balance.

### Action ID

`0xcc063de4`

### SDK Action

```ts
const pullTokenAction = new dfs.actions.basic.PullTokenAction(
    token,
    from,
    amount
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param tokenAddr Address of the token to pull
    /// @param from Address of the sender
    /// @param amount Amount of tokens to pull
    struct Params {
        address tokenAddr;
        address from;
        uint256 amount;
    }
```

### Return Value

```solidity
return bytes32(inputData.amount);
```

### Events and Logs

```solidity
```
