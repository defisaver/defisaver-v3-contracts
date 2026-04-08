---
icon: building-columns
---

# CompBorrow

### Description

Borrow a token from Compound

### Action ID

`0x82875a6c`

### SDK Action

```ts
const compoundBorrowAction = new dfs.actions.compound.CompoundBorrowAction(
    cTokenAddr,
    amount,
    to
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param cTokenAddr Address of the cToken token to borrow
    /// @param amount Amount of tokens to be borrowed
    /// @param to The address that will receive the borrowed tokens
    struct Params {
        address cTokenAddr;
        uint256 amount;
        address to;
    }
```

### Return Value

```solidity
return bytes32(withdrawAmount);
```

### Events and Logs

```solidity
emit ActionEvent("CompBorrow", logData);
logger.logActionDirectEvent("CompBorrow", logData);
bytes memory logData = abi.encode(params);
```
