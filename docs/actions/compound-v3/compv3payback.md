---
icon: building-columns
---

# CompV3Payback

### Description

Payback a token a user borrowed from Compound.

> **Notes**
>
> Amount type(uint).max will take the whole borrow amount.

### Action ID

`0xdaa9b106`

### SDK Action

```ts
const compoundV3PaybackAction = new dfs.actions.compoundV3.CompoundV3PaybackAction(
    market,
    amount,
    from,
    onBehalf,
    asset
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param market Main Comet proxy contract that is different for each compound market
    /// @param amount Amount of tokens to be paid back
    /// @param from Address where we are pulling the underlying tokens from
    /// @param onBehalf Repay on behalf of which address (if 0x0 defaults to user's wallet)
    struct Params {
        address market;
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
emit ActionEvent("CompV3Payback", logData);
logger.logActionDirectEvent("CompV3Payback", logData);
bytes memory logData = abi.encode(params);
```
