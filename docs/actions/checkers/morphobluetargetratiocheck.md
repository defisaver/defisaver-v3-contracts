---
icon: check
---

# MorphoBlueTargetRatioCheck

### Description

Action to check the ratio of the Morpho Blue position after strategy execution.

> **Notes**
>
> This action only checks for current ratio, without comparing it to the start ratio. 5% offset acceptable

### Action ID

`0x49f12f40`

### SDK Action

```ts
const morphoBlueTargetRatioCheckAction = new dfs.actions.checkers.MorphoBlueTargetRatioCheckAction(
    loanToken,
    collateralToken,
    oracle,
    irm,
    lltv,
    user,
    targetRatio
);
```

### Action Type

`CHECK_ACTION`

### Input Parameters

```solidity
    /// @param marketParams Morpho market parameters
    /// @param user User address that owns the position (EOA or proxy)
    /// @param targetRatio Target ratio
    struct Params {
        MarketParams marketParams;
        address user;
        uint256 targetRatio;
    }
```

### Return Value

```solidity
return bytes32(currRatio);
```

### Events and Logs

```solidity
emit ActionEvent("MorphoBlueTargetRatioCheck", logData);
bytes memory logData = abi.encode(currRatio);
```
