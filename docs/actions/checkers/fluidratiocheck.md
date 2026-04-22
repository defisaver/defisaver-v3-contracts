---
icon: check
---

# FluidRatioCheck

### Description

Action to check the ratio of the Fluid position after strategy execution.

> **Notes**
>
> 5% offset acceptable

### Action ID

`0xac7a850e`

### SDK Action

```ts
const fluidRatioCheckAction = new dfs.actions.checkers.FluidRatioCheckAction(
    nftId,
    ratioState,
    targetRatio
);
```

### Action Type

`CHECK_ACTION`

### Input Parameters

```solidity
    /// @param nftId NFT ID representing the position.
    /// @param ratioState State of the ratio (IN_BOOST or IN_REPAY)
    /// @param targetRatio Target ratio.
    struct Params {
        uint256 nftId;
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
emit ActionEvent("FluidRatioCheck", logData);
bytes memory logData = abi.encode(currRatio);
```
