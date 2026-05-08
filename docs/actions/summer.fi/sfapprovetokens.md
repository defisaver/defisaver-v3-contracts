---
icon: sun
---

# SFApproveTokens

### Description

Approve tokens through Summer.fi proxy

> **Notes**
>
> User wallet that calls this action needs to be permitted by Summer.fi proxy through AccountGuard

### Action ID

`0x869398d6`

### SDK Action

```ts
const sFApproveTokensAction = new dfs.actions.summerfi.SFApproveTokensAction(
    sfProxy,
    spender,
    tokens,
    allowances
);

```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param sfProxy  Summer.fi proxy address
    /// @param spender  User's wallet  address
    /// @param tokens  List of assets to approve
    /// @param allowances  Approve amounts
    struct Params {
        address sfProxy;
        address spender;
        address[] tokens;
        uint256[] allowances;
    }
```

### Return Value

```solidity
return bytes32(0);
```

### Events and Logs

```solidity
emit ActionEvent("SFApproveTokens", logData);
logger.logActionDirectEvent("SFApproveTokens", logData);
bytes memory logData = abi.encode(params);
```
