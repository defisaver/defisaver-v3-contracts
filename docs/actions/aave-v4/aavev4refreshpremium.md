---
icon: ghost
---

# AaveV4RefreshPremium

### Description

Allows user to refresh premium or dynamic reserve config.


### Action ID
`0xfa2bc34c`

### SDK Action
````ts
const aaveV4RefreshPremiumAction = new dfs.actions.aavev4.AaveV4RefreshPremiumAction(
    spoke,
    onBehalf,
    refreshDynamicReserveConfig
);
````

### Action Type
`STANDARD_ACTION`

### Input Parameters
```solidity
    /// @param spoke Address of the spoke.
    /// @param onBehalf Address to refresh the config on behalf of. Defaults to the user's wallet if not provided.
    /// @param refreshDynamicReserveConfig Whether to also refresh the dynamic reserve config for all collateral reserves.
    struct Params {
        address spoke;
        address onBehalf;
        bool refreshDynamicReserveConfig;
    }
```

### Return Value
```solidity
return bytes32(0);
```

### Events and Logs
```solidity
emit ActionEvent("AaveV4RefreshPremium", logData);
logger.logActionDirectEvent("AaveV4RefreshPremium", logData);
bytes memory logData = abi.encode(params);
```
