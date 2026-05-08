---
icon: hammer
---

# UpdateSub

### Description

Updates users sub information on SubStorage contract

> **Notes**
>
> User can only change his own subscriptions

### Action ID

`0xa985d903`

### SDK Action

```ts
const updateSubAction = new dfs.actions.basic.UpdateSubAction(
    subId,
    sub
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param subId Id of the Subscription
    /// @param sub Object that represents the updated sub
    struct Params {
        uint256 subId;
        StrategyModel.StrategySub sub;
    }
```

### Return Value

```solidity
return (bytes32(inputData.subId));
```

### Events and Logs

```solidity
```
