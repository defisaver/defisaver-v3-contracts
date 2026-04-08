---
icon: ethereum
---

# LSVBorrow

### Description

action for tracking users borrowings within the LSV ecosystem

### Action ID

`0xc173a756`

### SDK Action

```ts
const lSVBorrowAction = new dfs.actions.lsv.LSVBorrowAction(
    protocol,
    amount
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param protocol - an ID representing the protocol in LSVProfitTracker
    /// @param amount - amount of token being borrowed
    struct Params {
        uint256 protocol;
        uint256 amount;
    }
```

### Return Value

```solidity
return bytes32(inputData.amount);
```

### Events and Logs

```solidity
emit ActionEvent("LSVBorrow", logData);
logger.logActionDirectEvent("LSVBorrow", logData);
bytes memory logData = abi.encode(params);
```
