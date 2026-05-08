---
icon: check
---

# AaveV3RatioCheck

### Description

Action to check the ratio of the Aave V3 position after strategy execution.

> **Notes**
>
> 5% offset acceptable

### Action ID

`0x71ef3d4e`

### SDK Action

```ts
const aaveV3RatioCheckAction = new dfs.actions.checkers.AaveV3RatioCheckAction(
    ratioState,
    targetRatio
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
    /// @param market Aave V3 Market parameter that was added later in order to add support for different markets in strategies
    /// @param user EOA or Smart Wallet address parameter that was added later in order to add support for EOA strategies
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
emit ActionEvent("AaveV3RatioCheck", logData);
bytes memory logData = abi.encode(currRatio);
```
