---
icon: ghost
---

# AaveV3ClaimRewards

### Description

Claims single reward type specified by reward for the list of assets. Rewards are received by to address.

### Action ID

`0x3c4556e9`

### SDK Action

```ts
const aaveV3ClaimRewardsAction = new dfs.actions.aaveV3.AaveV3ClaimRewardsAction(
    assetsLength,
    amount,
    to,
    reward,
    assets
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param assetsLength Length of assets.
    /// @param amount Amount of rewards to claim.
    /// @param to Address that will be receiving the rewards.
    /// @param reward Reward address.
    /// @param assets Assets to claim rewards from.
    struct Params {
        uint8 assetsLength;
        uint256 amount;
        address to;
        address reward;
        address[] assets;
    }
```

### Return Value

```solidity
return bytes32(amountReceived);
```

### Events and Logs

```solidity
emit ActionEvent("AaveV3ClaimRewards", logData);
logger.logActionDirectEvent("AaveV3ClaimRewards", logData);
bytes memory logData = abi.encode(params);
```
