---
icon: triangle
---

# ConvexClaim

### Description

Action that claims Convex rewards.

### Action ID

`0xa8979c45`

### SDK Action

```ts
const convexClaimAction = new dfs.actions.convex.ConvexClaimAction(
    from,
    to,
    curveLp
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param from address for which to claim rewards
    /// @param to address that will receive the rewards
    /// @param rewardContract Address of the reward contract
    struct Params {
        address from;
        address to;
        address rewardContract;
    }
```

### Return Value

```solidity
return bytes32(crvEarned);
```

### Events and Logs

```solidity
emit ActionEvent("ConvexClaim", logData);
logger.logActionDirectEvent("ConvexClaim", logData);
bytes memory logData = abi.encode(params);
```
