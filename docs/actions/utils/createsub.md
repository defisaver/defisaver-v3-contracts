---
icon: hammer
---

# CreateSub

### Description

Action to create a new subscription

> **Notes**
>
> Gives user's wallet permission if needed and registers a new sub

### Action ID

`0xf41e543f`

### SDK Action

```ts
const createSubAction = new dfs.actions.basic.CreateSubAction(
    sub
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param _sub Subscription struct of the user (is not stored on chain, only the hash)
    struct Params {
        StrategyModel.StrategySub sub;
    }
```

### Return Value

```solidity
return (bytes32(subId));
```

### Events and Logs

```solidity
```
