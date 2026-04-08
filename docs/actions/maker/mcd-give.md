---
icon: m
---

# McdGive

### Description

Gives the vault ownership to a different address

### Action ID

`0xb2b1cae3`

### SDK Action

```ts
const makerGiveAction = new dfs.actions.maker.MakerGiveAction(
    vaultId,
    newOwner,
    createProxy,
    mcdManager
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param vaultId Id of the vault
    /// @param newOwner Address of the new owner
    /// @param mcdManager Manager address
    struct Params {
        uint256 vaultId;
        address newOwner;
        address mcdManager;
    }
```

### Return Value

```solidity
return bytes32(bytes20(newOwner));
```

### Events and Logs

```solidity
emit ActionEvent("McdGive", logData);
logger.logActionDirectEvent("McdGive", logData);
bytes memory logData = abi.encode(params);
```
