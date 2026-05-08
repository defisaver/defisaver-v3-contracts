---
icon: hammer
---

# SendTokensAndUnwrap

### Description

Helper action to send tokens to the specified addresses and unwrap for weth address

> **Notes**
>
> Sends tokens to the specified addresses, works with Eth also If token is weth address, it will unwrap by default If amount is type(uint).max it will send whole users' wallet balance

### Action ID

`0x13bc5bc1`

### SDK Action

```ts
const sendTokensAndUnwrapAction = new dfs.actions.basic.SendTokensAndUnwrapAction(
    tokens,
    receivers,
    amounts
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param tokens list of tokens to send
    /// @param receivers list of addresses that will receive corresponding tokens
    /// @param amounts list of amounts of corresponding tokens that will be sent
    struct Params {
        address[] tokens;
        address[] receivers;
        uint256[] amounts;
    }
```

### Return Value

```solidity
return bytes32(0);
```

### Events and Logs

```solidity
```
