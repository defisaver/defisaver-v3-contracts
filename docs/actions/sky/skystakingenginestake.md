---
icon: clouds-sun
---

# SkyStakingEngineStake

### Description

Stake SKY token via SKY protocol for different rewards

### Action ID

`0xa5236ed6`

### SDK Action

```ts
const skyStakingEngineStakeAction = new dfs.actions.sky.SkyStakingEngineStakeAction(
    stakingContract,
    index,
    amount,
    from
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param stakingContract address of the staking engine contract
    /// @param index index of the urn
    /// @param amount amount of stakingToken to stake
    /// @param from address from which to pull stakingToken
    struct Params {
        address stakingContract;
        uint256 index;
        uint256 amount;
        address from;
    }
```

### Return Value

```solidity
return bytes32(amountStaked);
```

### Events and Logs

```solidity
emit ActionEvent("SkyStakingEngineStake", logData);
logger.logActionDirectEvent("SkyStakingEngineStake", logData);
bytes memory logData = abi.encode(params);
```
