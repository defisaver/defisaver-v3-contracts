---
icon: check
---

# CurveUsdCollRatioCheck

### Description

Action to check the collateral ratio of the Curve USD position after strategy execution.

> **Notes**
>
> 5% offset acceptable

### Action ID

`0xe677476f`

### SDK Action

```ts
const curveUsdCollRatioCheckAction = new dfs.actions.checkers.CurveUsdCollRatioCheck(
    ratioState,
    targetRatio,
    controllerAddr
);

```

### Action Type

`CHECK_ACTION`

### Input Parameters

```solidity
    /// @param ratioState State of the ratio (IN_BOOST or IN_REPAY)
    /// @param targetRatio Target ratio.
    /// @param controllerAddress CurveUsd Controller address.
    struct Params {
        RatioState ratioState;
        uint256 targetRatio;
        address controllerAddress;
    }
```

### Return Value

```solidity
return bytes32(currRatio);
```

### Events and Logs

```solidity
emit ActionEvent("CurveUsdCollRatioCheck", logData);
bytes memory logData = abi.encode(currRatio);
```
