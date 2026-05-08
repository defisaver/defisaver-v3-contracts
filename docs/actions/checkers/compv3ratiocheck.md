---
icon: check
---

# CompV3RatioCheck

### Description

Action to check the ratio of the Compound V3 position after strategy execution.

> **Notes**
>
> 5% offset acceptable

### Action ID

`0x2ce67bb9`

### SDK Action

```ts
const compV3RatioCheckAction = new dfs.actions.checkers.CompoundV3RatioCheckAction(
    ratioState,
    targetRatio,
    market,
    user
);

```

### Action Type

`CHECK_ACTION`

### Input Parameters

```solidity
    /// @param ratioState State of the ratio (IN_BOOST or IN_REPAY)
    /// @param targetRatio Target ratio.
    /// @param market Market address.
    /// @param user User address.
    struct Params {
        RatioState ratioState;
        uint256 targetRatio;
        address market;
        address user;
    }
```

### Return Value

```solidity
return bytes32(currRatio);
```

### Events and Logs

```solidity
emit ActionEvent("CompV3RatioCheck", logData);
bytes memory logData = abi.encode(currRatio);
```
