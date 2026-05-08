---
icon: check
---

# AaveV3OpenRatioCheck

### Description

Action to check the ratio of the Aave V3 position after strategy execution.

> **Notes**
>
> This action only checks for current ratio, without comparing it to the start ratio
>
> 5% offset acceptable
>
> We are checking for 5% RATIO\_OFFSET only when the target ratio is < 999%
>
> If `targetRatio` is 999% or more then skip `RATIO_OFFSET` check because it is very hard to be precise under 5%.

### Action ID

`0x72b17abf`

### SDK Action

```ts
const aaveV3OpenRatioCheckAction = new dfs.actions.checkers.AaveV3OpenRatioCheckAction(
    targetRatio,
    market,
    user
);
```

### Action Type

`CHECK_ACTION`

### Input Parameters

```solidity
    /// @param targetRatio Target ratio.
    /// @param market Market address.
    /// @param user EOA or Smart Wallet address parameter that was added later in order to add support for EOA strategies.
    struct Params {
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
emit ActionEvent("AaveV3OpenRatioCheck", logData);
bytes memory logData = abi.encode(currRatio);
```
