---
icon: clouds-sun
---

# SkyUnstake

### Description

Unstake token from

### Action ID

`0x30d15631`

### SDK Action

```ts
const skyUnstakeAction = new dfs.actions.sky.SkyUnstakeAction(
    stakingContract,
    stakingToken,
    amount,
    to
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param stakingContract address of the staking rewards contract
    /// @param stakingToken address of the token being staked
    /// @param amount amount of stakingToken to unstake
    /// @param to address which will receive rewards
    struct Params {
        address stakingContract;
        address stakingToken;
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
emit ActionEvent("SkyUnstake", logData);
logger.logActionDirectEvent("SkyUnstake", logData);
bytes memory logData = abi.encode(params);
```
