---
icon: ghost
---

# AaveV4DelegateBorrow

### Description

Approves a spender to borrow from the specified reserve on behalf of the wallet.

### Action ID

`0xaa70a0b5`

### SDK Action

```ts
const aaveV4DelegateBorrowAction = new dfs.actions.aavev4.AaveV4DelegateBorrowAction(
    spoke,
    reserveId,
    spender,
    amount
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
/// @param spoke Address of the spoke.
/// @param reserveId Reserve id.
/// @param spender Address that will receive the borrow allowance.
/// @param amount Amount of borrow allowance.
struct Params {
    address spoke;
    uint256 reserveId;
    address spender;
    uint256 amount;
}
```

### Return Value

```solidity
return bytes32(amount)
```

### Events and Logs

```solidity
emit ActionEvent("AaveV4DelegateBorrow", logData);
logger.logActionDirectEvent("AaveV4DelegateBorrow", logData);
bytes memory logData = abi.encode(params);
```
