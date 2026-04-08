---
icon: clouds-sun
---

# SkyClaimRewards

### Description

Claim rewards earned by staking USDS on SKY

### Action ID

`0x742b59f2`

### SDK Action

```ts
const skyClaimRewardsAction = new dfs.actions.sky.SkyClaimRewardsAction(
    stakingContract,
    rewardToken,
    to
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param stakingContract address of the staking rewards contract
    /// @param rewardToken address of the token given out as reward
    /// @param to address which will receive rewardToken
    struct Params {
        address stakingContract;
        address rewardToken;
        address to;
    }
```

### Return Value

```solidity
return bytes32(amountClaimed);
```

### Events and Logs

```solidity
emit ActionEvent("SkyClaimRewards", logData);
logger.logActionDirectEvent("SkyClaimRewards", logData);
bytes memory logData = abi.encode(params);
```
