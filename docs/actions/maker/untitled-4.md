---
icon: m
---

# McdOpen

### Description

Open a new Maker empty vault

### Action ID

`0xb259bfca`

### SDK Action

```ts
const makerOpenVaultAction = new dfs.actions.maker.MakerOpenVaultAction(
    joinAddr,
    mcdManager
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param joinAddr Join address of the maker collateral
    /// @param mcdManager The manager address we are using
    struct Params {
        address joinAddr;
        address mcdManager;
    }
```

### Return Value

```solidity
return bytes32(newVaultId);
```

### Events and Logs

```solidity
emit ActionEvent("McdOpen", logData);
logger.logActionDirectEvent("McdOpen", logData);
bytes memory logData = abi.encode(params);
```
