---
icon: ghost
---

# GhoClaimAave

### Description

Action to claim AAVE rewards from stkGHO token

> **Notes**
>
> Claims AAVE reward from stkGHO token.

### Action ID

`0x17ca00ae`

### SDK Action

```ts
const ghoClaimAAVEAction = new dfs.actions.stkgho.GhoClaimAAVEAction(
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
emit ActionEvent("GhoClaimAAVE", logData);
logger.logActionDirectEvent("GhoClaimAAVE", logData);
bytes memory logData = abi.encode(params);
```
