---
icon: ghost
---

# AaveV4StoreRatio

## Description

Stores the ratio of the Aave V4 position in transient storage.

> **Notes**
>
> This action is used for validating the ratio of the position after strategy execution.


## Action ID
`0x3abbd56a`

## SDK Action
````ts
const aaveV4StoreRatioAction = new dfs.actions.aavev4.AaveV4StoreRatioAction(
    spoke,
    user
);
````

## Action Type
`CUSTOM_ACTION`

## Input Parameters
```solidity
    /// @param spoke Address of the spoke.
    /// @param user Address of the user. Defaults to the user's wallet if not provided.
    struct Params {
        address spoke;
        address user;
    }
```

## Return Value
```solidity
return bytes32(ratio);
```

## Events and Logs
```solidity
emit ActionEvent("AaveV4StoreRatio", logData);
bytes memory logData = abi.encode(params);
```
