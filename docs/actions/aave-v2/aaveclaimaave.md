---
icon: ghost
---

# AaveClaimAave

### Description

Action to claim AAVE rewards from stkAave token

> **Notes**
>
> Claims AAVE reward from stkAave token

### Action ID

`0x22ed53c6`

### SDK Action

```ts
const aaveClaimAAVEAction = new dfs.actions.aave.AaveClaimAAVEAction(
    amount,
    to
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param amount Amount of AAVE token to claim (uintMax is supported)
    /// @param to Address that will be receiving the rewards
    struct Params {
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
emit ActionEvent("AaveClaimAAVE", logData);
logger.logActionDirectEvent("AaveClaimAAVE", logData);
bytes memory logData = abi.encode(params);
```
