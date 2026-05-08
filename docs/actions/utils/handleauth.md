---
icon: hammer
---

# HandleAuth

### Description

Action to enable/disable smart wallet authorization

### Action ID

`0xd951fa77`

### SDK Action

```ts
const handleAuthAction = new dfs.actions.basic.HandleAuthAction(
    enableAuth
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param enableAuth Whether to enable or disable authorization
    struct Params {
        bool enableAuth;
    }
```

### Return Value

```solidity
return bytes32(0);
```

### Events and Logs

```solidity
```
