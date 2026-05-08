---
icon: hammer
---

# RemoveTokenApproval

### Description

Helper action to remove token approval given to a spender

> **Notes**
>
> Remove approval for spender to pull tokens from user wallet

### Action ID

`0x64514212`

### SDK Action

```ts
const removeTokenApprovalAction = new dfs.actions.basic.RemoveTokenApprovalAction(
    token,
    spender
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param tokenAddr Address of the token to remove approval from
    /// @param spender Address of the spender
    struct Params {
        address tokenAddr;
        address spender;
    }
```

### Return Value

```solidity
return bytes32(0);
```

### Events and Logs

```solidity
emit ActionEvent("RemoveTokenApproval", logData);
logger.logActionDirectEvent("RemoveTokenApproval", logData);
bytes memory logData = abi.encode(params);
```
