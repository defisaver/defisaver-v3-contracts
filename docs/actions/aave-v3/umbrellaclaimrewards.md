---
icon: ghost
---

# UmbrellaClaimRewards

### Description

UmbrellaClaimRewards - Claim rewards from staking in Umbrella staking system

### Action ID

`0x9160bac0`

### SDK Action

```ts
const umbrellaClaimRewardsAction = new dfs.actions.umbrella.UmbrellaClaimRewardsAction(
    asset,
    to,
    rewards
);

```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param asset The asset to claim rewards from
    /// @param to The address to send the rewards to
    /// @param rewards The rewards to claim
    struct Params {
        address asset;
        address to;
        address[] rewards;
    }
```

### Return Value

```solidity
return bytes32(amounts[0]);
```

### Events and Logs

```solidity
emit ActionEvent("UmbrellaClaimRewards", logData);
logger.logActionDirectEvent("UmbrellaClaimRewards", logData);
bytes memory logData = abi.encode(params);
```
