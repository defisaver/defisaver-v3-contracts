---
icon: sigma
---

# EulerV2ReorderCollaterals

### Description

Reorder account collaterals. Can be used to optimize gas costs when checking account health status

### Action ID

`0xb87c133d`

### SDK Action

```ts
const eulerV2ReorderCollateralsAction = new dfs.actions.eulerV2.EulerV2ReorderCollateralsAction(
    account,
    indexes
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param account The address of the Euler account, defaults to user's wallet
    /// @param indexes The array of swap steps to reorder collaterals
    struct Params {
        address account;
        uint8[][] indexes;
    }
```

### Return Value

```solidity
return bytes32(0);
```

### Events and Logs

```solidity
emit ActionEvent("EulerV2ReorderCollaterals", logData);
logger.logActionDirectEvent("EulerV2ReorderCollaterals", logData);
bytes memory logData = abi.encode(params);
```
