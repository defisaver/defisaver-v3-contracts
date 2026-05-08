---
icon: ghost
---

# AaveClaimStkAave

### Description

Action to claim stkAave rewards

> **Notes**
>
> Claims stkAave rewards on the assets of the lending pool

### Action ID

`0xd93d7e7f`

### SDK Action

```ts
const aaveClaimStkAaveAction = new dfs.actions.aave.AaveClaimStkAaveAction(
    assets,
    amount,
    to
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param assets Assets to claim rewards from.
    /// @param amount Amount of rewards to claim.
    /// @param to Address that will be receiving the rewards.
    struct Params {
        address[] assets;
        uint256 amount;
        address to;
    }
```

### Return Value

```solidity
return bytes32(claimedAmount);
```

### Events and Logs

```solidity
emit ActionEvent("AaveClaimStkAave", logData);
logger.logActionDirectEvent("AaveClaimStkAave", logData);
bytes memory logData = abi.encode(params);
```
