---
icon: hammer
---

# ToggleSub

### Description

ToggleSub - Sets the state of the sub to active or deactivated

> **Notes**
>
> User can only disable/enable his own subscriptions. This gives permission to dsproxy or safe to our auth contract to be able to execute the strategy

### Action ID

`0xd6499530`

### SDK Action

```ts
const toggleSubAction = new dfs.actions.basic.ToggleSubAction(
    subId,
    active
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param subId ID of the subscription to toggle
    /// @param active Whether to activate or deactivate the subscription
    struct Params {
        uint256 subId;
        bool active;
    }
```

### Return Value

```solidity
return (bytes32(inputData.subId));
```

### Events and Logs

```solidity
```
