---
icon: sigma
---

# EulerV2CollateralSwitch

### Description

Switch if vault will be used as collateral or not

### Action ID

`0x82b4e31e`

### SDK Action

```ts
const eulerV2CollateralSwitchAction = new dfs.actions.eulerV2.EulerV2CollateralSwitchAction(
    vault,
    account,
    enableAsColl
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param vault The address of the vault
    /// @param account The address of the Euler account, defaults to user's wallet
    /// @param enableAsColl Whether to enable or disable the vault as collateral
    struct Params {
        address vault;
        address account;
        bool enableAsColl;
    }
```

### Return Value

```solidity
return bytes32(uint256(params.enableAsColl ? 1 : 0));
```

### Events and Logs

```solidity
emit ActionEvent("EulerV2CollateralSwitch", logData);
logger.logActionDirectEvent("EulerV2CollateralSwitch", logData);
bytes memory logData = abi.encode(params);
```
