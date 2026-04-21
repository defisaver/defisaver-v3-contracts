---
icon: bluesky
---

# MorphoAaveV3SetManager

### Description

Allow or disallow an address to manage your Morpho-AaveV3 position on your wallet

### Action ID

`0x1ee82dad`

### SDK Action

```ts
const morphoAaveV3SetManagerAction = new dfs.actions.morpho.aaveV3.MorphoAaveV3SetManagerAction(
    emodeId,
    manager,
    isAllowed
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param emodeId Type of emode we are entering in, each one is different deployment on Morpho
    /// @param manager Address of the manager
    /// @param isAllowed Whether the manager is allowed to manage the position
    struct Params {
        uint256 emodeId;
        address manager;
        bool isAllowed;
    }
```

### Return Value

```solidity
return bytes32(bytes20(params.manager));
```

### Events and Logs

```solidity
emit ActionEvent("MorphoAaveV3SetManager", logData);
logger.logActionDirectEvent("MorphoAaveV3SetManager", logData);
bytes memory logData = abi.encode(params);
```
