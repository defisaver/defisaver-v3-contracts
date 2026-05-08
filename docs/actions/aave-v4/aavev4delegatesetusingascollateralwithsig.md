---
icon: ghost
---

# AaveV4DelegateSetUsingAsCollateralWithSig

### Description

Action that approves a delegatee to set using as collateral on behalf of delegator with EIP712 signature.


### Action ID
`0x5a07161d`

### SDK Action
````ts
const aaveV4DelegateSetUsingAsCollateralWithSigAction = new dfs.actions.aavev4.AaveV4DelegateSetUsingAsCollateralWithSigAction(
    permit,
    signature
);
````

### Action Type
`STANDARD_ACTION`

### Input Parameters
```solidity
    /// @notice Structured parameters for using as collateral permission permit intent.
    /// @dev spoke The address of the Spoke.
    /// @dev delegator The address of the delegator.
    /// @dev delegatee The address of the delegatee.
    /// @dev permission The new permission status.
    /// @dev nonce The key-prefixed nonce for the signature.
    /// @dev deadline The deadline for the intent.
    struct SetCanSetUsingAsCollateralPermissionPermit {
        address spoke;
        address delegator;
        address delegatee;
        bool permission;
        uint256 nonce;
        uint256 deadline;
    }

    /// @param permit The structured SetCanSetUsingAsCollateralPermissionPermit parameters.
    /// @param signature The EIP712-compliant signature bytes.
    struct Params {
        IConfigPositionManager.SetCanSetUsingAsCollateralPermissionPermit permit;
        bytes signature;
    }
```

### Return Value
```solidity
return bytes32(permission);
```

### Events and Logs
```solidity
emit ActionEvent("AaveV4DelegateSetUsingAsCollateralWithSig", logData);
logger.logActionDirectEvent("AaveV4DelegateSetUsingAsCollateralWithSig", logData);
bytes memory logData = abi.encode(params);
```
