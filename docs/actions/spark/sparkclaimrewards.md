---
icon: sparkles
---

# SparkClaimRewards

### Description

Claims single reward type specified by reward for the list of assets. Rewards are received by to address.

### Action ID

`0x948d2ba7`

### SDK Action

```ts
const sparkClaimRewardsAction = new dfs.actions.spark.SparkClaimRewardsAction(
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
    /// @param assetsLength Length of the assets array
    /// @param amount Amount of tokens to claim
    /// @param to Address to send the claimed tokens to
    /// @param reward Address of the reward token
    /// @param assets Array of asset addresses
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
emit ActionEvent("SparkClaimRewards", logData);
logger.logActionDirectEvent("SparkClaimRewards", logData);
bytes memory logData = abi.encode(params);
```
