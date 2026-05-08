---
icon: check
---

# LiquityRatioCheck

### Description

Action to check the ratio of the Liquity position after strategy execution.

### Action ID

`0xafe610df`

### SDK Action

```ts
const liquityRatioCheckAction = new dfs.actions.checkers.LiquityRatioCheckAction(
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
emit ActionEvent("LiquityRatioCheck", logData);
bytes memory logData = abi.encode(currRatio);
```
