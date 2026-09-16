---
icon: ghost
---

# AaveV4SetUserPositionManagers

### Description

Sets position managers for the user's wallet.

### Action ID

`0x8cc6d554`

### SDK Action

```ts
const aaveV4SetUserManagersAction = new dfs.actions.aavev4.AaveV4SetUserManagersAction(
    spoke,
    updates
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
/// @notice Sub-Intent data to apply position manager update for user.
/// @param positionManager The address of the position manager.
/// @param approve True to approve the position manager, false to revoke approval.
struct PositionManagerUpdate {
    address positionManager;
    bool approve;
}

/// @param spoke Address of the spoke.
/// @param updates The array of position manager updates.
struct Params {
    address spoke;
    ISpoke.PositionManagerUpdate[] updates;
}
```

### Return Value

```solidity
return bytes32(0)
```

### Events and Logs

```solidity
emit ActionEvent("AaveV4SetUserManagers", logData);
logger.logActionDirectEvent("AaveV4SetUserManagers", logData);
bytes memory logData = abi.encode(params);
```
