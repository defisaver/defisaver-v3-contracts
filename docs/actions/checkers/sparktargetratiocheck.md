---
icon: check
---

# SparkTargetRatioCheck

### Description

Action to check the ratio of the Spark position after strategy execution.

> **Notes**
>
> 5% offset acceptable.&#x20;
>
> We are checking for 5% RATIO\_OFFSET only when the target ratio is < 999%.
>
> If `targetRatio` is 999% or more then skip `RATIO_OFFSET` check because it is very hard to be precise under 5%.
>
> If user is subscribed on full repay, current ratio must be exactly 0.

### Action ID

`0x66d60c1e`

### SDK Action

```ts
const sparkTargetRatioCheckAction = new dfs.actions.checkers.SparkTargetRatioCheck(
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
/// @param user EOA or Smart Wallet address parameter that was added later in order to add support for EOA strategies
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
emit ActionEvent("SparkTargetRatioCheck", logData);
bytes memory logData = abi.encode(currRatio);
```
