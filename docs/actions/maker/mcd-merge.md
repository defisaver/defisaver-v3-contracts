---
icon: m
---

# McdMerge

### Description

Merge two vaults that are of the same type, first into second

### Action ID

`0xd2c234d0`

### SDK Action

```ts
const makerMergeAction = new dfs.actions.maker.MakerMergeAction(
    srcVaultId,
    destVaultId,
    mcdManager
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param srcVaultId Id of the source vault
    /// @param destVaultId Id of the destination vault
    /// @param mcdManager Manager address
    struct Params {
        uint256 srcVaultId;
        uint256 destVaultId;
        address mcdManager;
    }
```

### Return Value

```solidity
return bytes32(inputData.destVaultId);
```

### Events and Logs

```solidity
emit ActionEvent("McdMerge", logData);
logger.logActionDirectEvent("McdMerge", logData);
bytes memory logData = abi.encode(params);
```
