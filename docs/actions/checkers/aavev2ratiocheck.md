---
icon: check
---

# AaveV2RatioCheck

### Description

Action to check the ratio of the Aave V2 position after strategy execution.

> **Notes**
>
> 5% offset acceptable.

### Action ID

`0xe2833393`

### SDK Action

```ts
const aaveV2RatioCheckAction = new dfs.actions.checkers.AaveV2RatioCheckAction(
    ratioState,
    targetRatio
);
```

### Action Type

`CHECK_ACTION`

### Input Parameters

```solidity
    /// @param ratioState State of the ratio (IN_BOOST or IN_REPAY)
    /// @param targetRatio Target ratio.
    struct Params {
        RatioState ratioState;
        uint256 targetRatio;
    }
```

### Return Value

```solidity
return bytes32(currRatio);
```

### Events and Logs

```solidity
emit ActionEvent("AaveV2RatioCheck", logData);
bytes memory logData = abi.encode(currRatio);
```
