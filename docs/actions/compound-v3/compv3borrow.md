---
icon: building-columns
---

# CompV3Borrow

### Description

Borrow base token from CompoundV3.

### Action ID

`0xbb9f4021`

### SDK Action

```ts
const compoundV3BorrowAction = new dfs.actions.compoundV3.CompoundV3BorrowAction(
    market,
    amount,
    to,
    onBehalf
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param market Main Comet proxy contract that is different for each compound market
    /// @param amount Amount of tokens to be borrowed
    /// @param to The address we are sending the borrowed tokens to
    /// @param onBehalf The address from where we are borrowing the tokens from. Defaults to the user's wallet.
    struct Params {
        address market;
        uint256 amount;
        address to;
        address onBehalf;
    }
```

### Return Value

```solidity
return bytes32(withdrawAmount);
```

### Events and Logs

```solidity
emit ActionEvent("CompV3Borrow", logData);
logger.logActionDirectEvent("CompV3Borrow", logData);
bytes memory logData = abi.encode(params);
```
