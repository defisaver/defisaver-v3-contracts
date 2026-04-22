---
icon: ghost
---

# AaveV4Borrow

### Description

Borrow a token from AaveV4 spoke.


### Action ID
`0x3f528c6f`

### SDK Action
````ts
const aaveV4BorrowAction = new dfs.actions.aavev4.AaveV4BorrowAction(
    spoke,
    onBehalf,
    to,
    reserveId,
    amount
);
````

### Action Type
`STANDARD_ACTION`

### Input Parameters
```solidity
    /// @param spoke Address of the spoke.
    /// @param onBehalf Address to borrow tokens on behalf of. Defaults to the user's wallet if not provided.
    /// @param to Address that will receive the borrowed tokens.
    /// @param reserveId Reserve id.
    /// @param amount Amount of tokens to borrow.
    struct Params {
        address spoke;
        address onBehalf;
        address to;
        uint256 reserveId;
        uint256 amount;
    }
```

### Return Value
```solidity
return bytes32(amount);
```

### Events and Logs
```solidity
emit ActionEvent("AaveV4Borrow", logData);
logger.logActionDirectEvent("AaveV4Borrow", logData);
bytes memory logData = abi.encode(params);
```
