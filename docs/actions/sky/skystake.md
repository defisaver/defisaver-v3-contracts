---
icon: clouds-sun
---

# SkyStake

### Description

Stake USDS via SKY for different rewards

### Action ID

`0xa2b6e191`

### SDK Action

```ts
const skyStakeAction = new dfs.actions.sky.SkyStakeAction(
    stakingContract,
    stakingToken,
    amount,
    from
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param stakingContract address of the staking rewards contract
    /// @param stakingToken address of the token being staked
    /// @param amount amount of stakingToken to stake
    /// @param from address from which to pull stakingToken
    struct Params {
        address stakingContract;
        address stakingToken;
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
emit ActionEvent("SkyStake", logData);
logger.logActionDirectEvent("SkyStake", logData);
bytes memory logData = abi.encode(params);
```
