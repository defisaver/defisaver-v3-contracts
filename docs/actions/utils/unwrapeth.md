---
icon: hammer
---

# UnwrapEth

### Description

Helper action to un-wrap WETH9 to Eth

> **Notes**
>
> Unwraps WETH9 -> Eth. If to == user's wallet, it will stay on user's wallet.

### Action ID

`0x929145d0`

### SDK Action

```ts
const unwrapEthAction = new dfs.actions.basic.UnwrapEthAction(
    amount,
    to
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param amount Amount of Weth to unwrap
    /// @param to Address where to send the unwrapped Eth
    struct Params {
        uint256 amount;
        address to;
    }
```

### Return Value

```solidity
return bytes32(_unwrapEth(inputData.amount, inputData.to));
```

### Events and Logs

```solidity
```
