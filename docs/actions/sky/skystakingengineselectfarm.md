---
icon: clouds-sun
---

# SkyStakingEngineSelectFarm

### Description

Selects a farm for the SKY Staking Engine Position

### Action ID

`0x7e2517f6`

### SDK Action

```ts
const skyStakingEngineSelectFarmAction = new dfs.actions.sky.SkyStakingEngineSelectFarmAction(
    stakingContract,
    index,
    farm
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param stakingContract address of the staking engine contract
    /// @param index index of the urn
    /// @param farm address of farm to select
    struct Params {
        address stakingContract;
        uint256 index;
        address farm;
    }
```

### Return Value

```solidity
return bytes32(bytes20(farm));
```

### Events and Logs

```solidity
emit ActionEvent("SkyStakingEngineSelectFarm", logData);
logger.logActionDirectEvent("SkyStakingEngineSelectFarm", logData);
bytes memory logData = abi.encode(params);
```
