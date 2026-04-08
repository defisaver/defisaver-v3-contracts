---
icon: hammer
---

# SendTokenAndUnwrap

### Description

Helper action to send a token to the specified address and unwrap if weth address

> **Notes**
>
> Sends a token to the specified addr, works with Eth also. If amount is type(uint).max it will send whole users' wallet balance. If weth address is set it will unwrap by default.

### Action ID

`0x17782156`

### SDK Action

```ts
const sendTokenAndUnwrapAction = new dfs.actions.basic.SendTokenAndUnwrapAction(
    token,
    to,
    amount
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param tokenAddr Address of the token to send
    /// @param to Address of the recipient
    /// @param amount Amount of tokens to send
    struct Params {
        address tokenAddr;
        address to;
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
