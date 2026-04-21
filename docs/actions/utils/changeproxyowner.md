---
icon: hammer
---

# ChangeProxyOwner

### Description

Changes the owner of the DSProxy and updated the DFSRegistry

### Action ID

`0x67314f12`

### SDK Action

```ts
const changeProxyOwnerAction = new dfs.actions.basic.ChangeProxyOwnerAction(
    newOwner
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param newOwner Address of the new owner
    struct Params {
        address newOwner;
    }
```

### Return Value

```solidity
return bytes32(bytes20(inputData.newOwner));
```

### Events and Logs

```solidity
```
