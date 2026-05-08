---
icon: clouds-sun
---

# SkyStakingEngineOpen

### Description

Create position via LockstakeEngine

### Action ID

`0x677c3722`

### SDK Action

```ts
const skyStakingEngineOpenAction = new dfs.actions.sky.SkyStakingEngineOpenAction(
    stakingContract
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param stakingContract address of the staking engine contract
    struct Params {
        address stakingContract;
    }
```

### Return Value

```solidity
return bytes32(index);
```

### Events and Logs

```solidity
emit ActionEvent("SkyStakingEngineOpen", logData);
logger.logActionDirectEvent("SkyStakingEngineOpen", logData);
bytes memory logData = abi.encode(params);
```
