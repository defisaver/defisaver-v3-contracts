---
icon: check
---

# McdRatioCheck

### Description

Action to check the ratio of the Maker position after strategy execution.

> **Notes**
>
> 2% offset acceptable

### Action ID

`0x39274269`

### SDK Action

```ts
const mcdRatioCheckAction = new dfs.actions.McdRatioCheckAction(
    ...args
);

```

### Action Type

`CHECK_ACTION`

### Input Parameters

```solidity
    /// @param ratioState State of the ratio (SHOULD_BE_LOWER or SHOULD_BE_HIGHER)
    /// @param checkTarget Whether to check if the ratio is in the target range.
    /// @param ratioTarget Target ratio.
    /// @param vaultId Vault ID.
    /// @param startRatioIndex Index in returnValues where ratio before actions is stored
    struct Params {
        RatioState ratioState;
        bool checkTarget;
        uint256 ratioTarget;
        uint256 vaultId;
        uint256 startRatioIndex;
    }
```

### Return Value

```solidity
return bytes32(inputData.ratioTarget);
```

### Events and Logs

```solidity
emit ActionEvent("McdRatioCheck", logData);
bytes memory logData = abi.encode(currRatio);
```
