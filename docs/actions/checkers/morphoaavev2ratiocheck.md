---
icon: check
---

# MorphoAaveV2RatioCheck

### Description

Action to check the ratio of the Morpho Aave V2 position after strategy execution.

> **Notes**
>
> 5% offset acceptable

### Action ID

`0xb22cb584`

### SDK Action

```ts
const morphoAaveV2RatioCheckAction = new dfs.actions.checkers.MorphoAaveV2RatioCheckAction(
    ratioState,
    targetRatio,
    user
);
```

### Action Type

`CHECK_ACTION`

### Input Parameters

```solidity
    /// @param ratioState State of the ratio (IN_BOOST or IN_REPAY)
    /// @param targetRatio Target ratio.
    /// @param user User address.
    struct Params {
        RatioState ratioState;
        uint256 targetRatio;
        address user;
    }
```

### Return Value

```solidity
return bytes32(currRatio);
```

### Events and Logs

```solidity
emit ActionEvent("MorphoAaveV2RatioCheck", logData);
bytes memory logData = abi.encode(currRatio);
```
