---
icon: clouds-sun
---

# SkyStakingEngineUnstake

### Description

Unstake SKY tokens from previously staked position

### Action ID

`0x51a3f99a`

### SDK Action

```ts
const skyStakingEngineUnstakeAction = new dfs.actions.sky.SkyStakingEngineUnstakeAction(
    stakingContract,
    index,
    amount,
    to
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param stakingContract address of the staking engine contract
    /// @param index index of the urn
    /// @param amount amount of stakingToken to unstake
    /// @param to address to which to send stakingToken
    struct Params {
        address stakingContract;
        uint256 index;
        uint256 amount;
        address to;
    }
```

### Return Value

```solidity
return bytes32(amountUnstaked);
```

### Events and Logs

```solidity
emit ActionEvent("SkyStakingEngineUnstake", logData);
logger.logActionDirectEvent("SkyStakingEngineUnstake", logData);
bytes memory logData = abi.encode(params);
```
