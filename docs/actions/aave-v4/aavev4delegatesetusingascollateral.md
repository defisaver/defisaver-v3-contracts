---
icon: ghost
---

# AaveV4DelegateSetUsingAsCollateral

### Description

Approves a delegatee to set using as collateral on behalf of the wallet.

### Action ID

`0xe4860f02`

### SDK Action

```ts
const aaveV4DelegateSetUsingAsCollateralAction = new dfs.actions.aavev4.AaveV4DelegateSetUsingAsCollateralAction(
    spoke,
    delegatee,
    permission
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
/// @param spoke Address of the spoke.
/// @param delegatee Address that will receive the permission.
/// @param permission Whether the delegatee can set using as collateral.
struct Params {
    address spoke;
    address delegatee;
    bool permission;
}
```

### Return Value

```solidity
return bytes32(permission)
```

### Events and Logs

```solidity
emit ActionEvent("AaveV4DelegateSetUsingAsCollateral", logData);
logger.logActionDirectEvent("AaveV4DelegateSetUsingAsCollateral", logData);
bytes memory logData = abi.encode(params);
```
