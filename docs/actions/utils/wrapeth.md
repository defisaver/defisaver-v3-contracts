---
icon: hammer
---

# WrapEth

### Description

Helper action to wrap Ether to WETH9

> **Notes**
>
> Wraps native Eth to WETH9 token. If amount is type(uint256).max wraps whole balance.

### Action ID

`0x11135183`

### SDK Action

```ts
const wrapEthAction = new dfs.actions.basic.WrapEthAction(
    amount,
    includeEthInTx
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param amount Amount of ether to wrap
    struct Params {
        uint256 amount;
    }
```

### Return Value

```solidity
return bytes32(_wrapEth(inputData.amount));
```

### Events and Logs

```solidity
```
