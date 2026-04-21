---
icon: hammer
---

# SendTokens

### Description

Helper action to send tokens to the specified addresses

> **Notes**
>
> Sends tokens to the specified addresses, works with Eth also

### Action ID

`0xa87d9d0e`

### SDK Action

```ts
const sendTokensAction = new dfs.actions.basic.SendTokensAction(
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
