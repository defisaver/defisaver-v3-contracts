---
icon: bluesky
---

# MorphoBlueSetAuth

### Description

Allow or disallow an address to manage MorphoBlue position on user's wallet

### Action ID

`0x3f1352f1`

### SDK Action

```ts
const morphoBlueSetAuthAction = new dfs.actions.morpho-blue.MorphoBlueSetAuthAction(
    manager,
    newIsAuthorized
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param manager Address of the manager
    /// @param newIsAuthorized Whether the manager is allowed to manage the position
    struct Params {
        address manager;
        bool newIsAuthorized;
    }
```

### Return Value

```solidity
return bytes32(bytes20(params.manager));
```

### Events and Logs

```solidity
emit ActionEvent("MorphoBlueSetAuth", logData);
logger.logActionDirectEvent("MorphoBlueSetAuth", logData);
bytes memory logData = abi.encode(params);
```
