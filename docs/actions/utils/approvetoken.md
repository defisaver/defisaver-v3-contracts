---
icon: hammer
---

# ApproveToken

### Description

Helper action to approve spender to pull an amount of tokens from user's wallet

> **Notes**
>
> Approves an amount of tokens for spender to pull from user's wallet

### Action ID

`0xbb8027f4`

### SDK Action

```ts
const approveTokenAction = new dfs.actions.basic.ApproveTokenAction(
    token,
    spender,
    amount
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param tokenAddr Address of token to approve
    /// @param spender Address of the spender
    /// @param amount Amount of tokens to approve
    struct Params {
        address tokenAddr;
        address spender;
        uint256 amount;
    }
```

### Return Value

```solidity
return bytes32(inputData.amount);
```

### Events and Logs

```solidity
emit ActionEvent("ApproveToken", logData);
logger.logActionDirectEvent("ApproveToken", logData);
bytes memory logData = abi.encode(params);
```
