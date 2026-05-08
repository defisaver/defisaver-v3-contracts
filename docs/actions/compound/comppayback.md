---
icon: building-columns
---

# CompPayback

### Description

Payback a token a user borrowed from Compound.

> **Notes**
>
> Payback a borrowed token from the Compound protocol.

### Action ID

`0x4cbab3db`

### SDK Action

```ts
const compoundPaybackAction = new dfs.actions.compound.CompoundPaybackAction(
    cTokenAddr,
    amount,
    from,
    onBehalf
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param cTokenAddr Address of the cToken token to payback
    /// @param amount Amount of tokens to be paid back
    /// @param from Address where we are pulling the underlying tokens from
    /// @param onBehalf Repay on behalf of which address (if 0x0 defaults to user's wallet)
    struct Params {
        address cTokenAddr;
        uint256 amount;
        address from;
        address onBehalf;
    }
```

### Return Value

```solidity
return bytes32(withdrawAmount);
```

### Events and Logs

```solidity
emit ActionEvent("CompPayback", logData);
logger.logActionDirectEvent("CompPayback", logData);
bytes memory logData = abi.encode(params);
```
