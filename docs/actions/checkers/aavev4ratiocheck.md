---
icon: check
---

# AaveV4RatioCheck

### Description

Action to check the ratio of the Aave V4 position after strategy execution.

> **Notes**
>
> 5% offset acceptable


### Action ID
`0x707ad6fd`

### SDK Action
````ts
const aaveV4RatioCheckAction = new dfs.actions.AaveV4RatioCheckAction(
    ratioState,
    targetRatio,
    spoke,
    user
);

````

### Action Type
`CHECK_ACTION`

### Input Parameters
```solidity
    /// @param ratioState State of the ratio (IN_BOOST or IN_REPAY)
    /// @param targetRatio Target ratio.
    /// @param spoke Aave V4 spoke address.
    /// @param user User address.
    struct Params {
        RatioState ratioState;
        uint256 targetRatio;
        address spoke;
        address user;
    }
```

### Return Value
```solidity
return bytes32(current);
```

### Events and Logs
```solidity
emit ActionEvent("AaveV4RatioCheck", logData);
bytes memory logData = abi.encode(currRatio);
```
