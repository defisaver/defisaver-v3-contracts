---
icon: hammer
---

# PermitToken

### Description

Helper action to invoke a permit action signed by a user

> **Notes**
>
> Every successful call to permit increases owners nonce by one.

### Action ID

`0x25a4d738`

### SDK Action

```ts
const permitTokenAction = new dfs.actions.basic.PermitTokenAction(
    token,
    owner,
    spender,
    value,
    deadline,
    v,
    r,
    s
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param tokenAddr Address of the token to permit
    /// @param owner Address of the owner
    /// @param spender Address of the spender
    /// @param value Amount of tokens to permit
    /// @param deadline Deadline of the permit
    /// @param v ECDSA signature v
    /// @param r ECDSA signature r
    /// @param s ECDSA signature s
    struct Params {
        address tokenAddr;
        address owner;
        address spender;
        uint256 value;
        uint256 deadline;
        uint8 v;
        bytes32 r;
        bytes32 s;
    }
```

### Return Value

```solidity
return bytes32(inputData.value);
```

### Events and Logs

```solidity
```
