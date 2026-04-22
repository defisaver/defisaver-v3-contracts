---
icon: check
---

# LiquityV2TargetRatioCheck

### Description

Action to check the ratio of the LiquityV2 position after strategy execution.

> **Notes**
>
> This action only checks for current ratio, without comparing it to the start ratio. 5% offset acceptable

### Action ID

`0xd54d1b42`

### SDK Action

```ts
const liquityV2TargetRatioCheckAction = new dfs.actions.checkers.LiquityV2TargetRatioCheckAction(
    market,
    troveId,
    targetRatio
);
```

### Action Type

`CHECK_ACTION`

### Input Parameters

```solidity
    /// @param market Market address.
    /// @param troveId Trove ID.
    /// @param targetRatio Target ratio.
    struct Params {
        address market;
        uint256 troveId;
        uint256 targetRatio;
    }
```

### Return Value

```solidity
return bytes32(currRatio);
```

### Events and Logs

```solidity
emit ActionEvent("LiquityV2TargetRatioCheck", logData);
bytes memory logData = abi.encode(currRatio);
```
