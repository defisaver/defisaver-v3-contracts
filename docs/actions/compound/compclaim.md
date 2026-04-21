---
icon: building-columns
---

# CompClaim

### Description

Claims Comp reward for the specified user.

> **Notes**
>
> Claims comp for \_from address and for specified cTokens.

### Action ID

`0xd7a3d3f6`

### SDK Action

```ts
const compoundClaimAction = new dfs.actions.compound.CompoundClaimAction(
    cSupplyAddresses,
    cBorrowAddresses,
    from,
    to
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param cTokensSupply Array of cTokens which the user supplied and has earned rewards
    /// @param cTokensBorrow Array of cTokens which the user borrowed and has earned rewards
    /// @param from The address that is claiming the rewards
    /// @param to The address that will receive the rewards
    struct Params {
        address[] cTokensSupply;
        address[] cTokensBorrow;
        address from;
        address to;
    }
```

### Return Value

```solidity
return bytes32(compClaimed);
```

### Events and Logs

```solidity
emit ActionEvent("CompClaim", logData);
logger.logActionDirectEvent("CompClaim", logData);
bytes memory logData = abi.encode(params);
```
