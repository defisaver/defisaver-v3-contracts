---
icon: check
---

# LiquityRatioIncreaseCheck

### Description

Action to check if ratio of the Liquity position after strategy execution is greater than the target ratio.

> **Notes**
>
> 5% offset acceptable

### Action ID

`0x3b29b437`

### SDK Action

```ts
const liquityRatioIncreaseCheckAction = new dfs.actions.checkers.LiquityRatioIncreaseCheckAction(
    targetRatioIncrease
);
```

### Action Type

`CHECK_ACTION`

### Input Parameters

```solidity
    /// @param targetRatioIncrease Target ratio increase.
    struct Params {
        uint256 targetRatioIncrease;
    }
```

### Return Value

```solidity
return bytes32(currRatio);
```

### Events and Logs

```solidity
emit ActionEvent("LiquityRatioIncreaseCheck", logData);
bytes memory logData = abi.encode(currRatio);
```
