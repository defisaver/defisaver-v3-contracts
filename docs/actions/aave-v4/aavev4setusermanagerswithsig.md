---
icon: ghost
---

# AaveV4SetUserManagersWithSig

### Description

Sets user position managers with EIP712-typed signature.

### Action ID
`0xa6f596a0`

### SDK Action
````ts
const aaveV4SetUserManagersWithSigAction = new dfs.actions.aavev4.AaveV4SetUserManagersWithSigAction(
    spoke,
    onBehalf,
    nonce,
    deadline,
    signature,
    updates
);
````

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
    /// @param onBehalf The address of the user on whose behalf position manager can act.
    /// @param nonce The nonce for the signature.
    /// @param deadline The deadline for the signature.
    /// @param signature The signature bytes.
    /// @param updates The array of position manager updates.
    struct Params {
        address spoke;
        address onBehalf;
        uint256 nonce;
        uint256 deadline;
        bytes signature;
        ISpoke.PositionManagerUpdate[] updates;
    }
```

### Return Value
```solidity
return bytes32(0);
```

### Events and Logs
```solidity
emit ActionEvent("AaveV4SetUserManagersWithSig", logData);
logger.logActionDirectEvent("AaveV4SetUserManagersWithSig", logData);
bytes memory logData = abi.encode(params);
```
