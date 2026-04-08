---
description: Creates a Chicken Bond from a proxy
icon: drumstick
---

# CBCreate

### Description

Creates a Chicken Bond from a proxy

> **Notes**
>
> If amount == max.uint it will pull whole balance of .from

### Action ID

`0xb5b50f23`

### SDK Action

```ts
const cBCreateAction = new dfs.actions.chickenBonds.CBCreateAction(
    amount,
    from
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param amount LUSD token amount to pull
    /// @param from Account from where to pull LUSD amount
    struct Params {
        uint256 amount;
        address from;
    }
```

### Return Value

```solidity
return bytes32(bondId);
```

### Events and Logs

```solidity
emit ActionEvent("CBCreate", logData);
logger.logActionDirectEvent("CBCreate", logData);
bytes memory logData = abi.encode(params);
```
