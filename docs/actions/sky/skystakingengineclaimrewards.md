---
icon: clouds-sun
---

# SkyStakingEngineClaimRewards

### Description

Claim rewards earned by staking SKY in Staking Engine

### Action ID

`0xfdbd8ef6`

### SDK Action

```ts
const skyStakingEngineClaimRewardsAction = new dfs.actions.sky.SkyStakingEngineClaimRewardsAction(
    stakingContract,
    index,
    farm,
    to
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param stakingContract address of the staking engine contract
    /// @param index index of the urn
    /// @param farm address of farm to claim from
    /// @param to address to which to send rewards
    struct Params {
        address stakingContract;
        uint256 index;
        address farm;
        address to;
    }
```

### Return Value

```solidity
return bytes32(amountStaked);
```

### Events and Logs

```solidity
emit ActionEvent("SkyStakingEngineClaimRewards", logData);
logger.logActionDirectEvent("SkyStakingEngineClaimRewards", logData);
bytes memory logData = abi.encode(params);
```
