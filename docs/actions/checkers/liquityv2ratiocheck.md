---
icon: check
---

# LiquityV2RatioCheck

### Description

Action to check the ratio of the Liquity V2 position after strategy execution.

> **Notes**
>
> 5% offset acceptable

### Action ID

`0x81a0dbab`

### SDK Action

```ts
const liquityV2RatioCheckAction = new dfs.actions.checkers.LiquityV2RatioCheckAction(
    market,
    troveId,
    ratioState,
    targetRatio
);
```

### Action Type

`CHECK_ACTION`

### Input Parameters

```solidity
    /// @param market Market address.
    /// @param troveId Trove ID.
    /// @param ratioState State of the ratio (IN_BOOST or IN_REPAY)
    /// @param targetRatio Target ratio.
    struct Params {
        address market;
        uint256 troveId;
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
emit ActionEvent("LiquityV2RatioCheck", logData);
bytes memory logData = abi.encode(currRatio);
```
