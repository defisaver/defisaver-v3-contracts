---
icon: check
---

# SparkRatioCheck

### Description

Action to check the ratio of the Spark position after strategy execution.

> **Notes**
>
> 5% offset acceptable

### Action ID

`0xaf91e475`

### SDK Action

```ts
const sparkRatioCheckAction = new dfs.actions.checkers.SparkRatioCheckAction(
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
emit ActionEvent("SparkRatioCheck", logData);
bytes memory logData = abi.encode(currRatio);
```
