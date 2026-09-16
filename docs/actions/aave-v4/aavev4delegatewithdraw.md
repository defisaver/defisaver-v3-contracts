---
icon: ghost
---

# AaveV4DelegateWithdraw

### Description

Approves a spender to withdraw from the specified reserve on behalf of the wallet.

### Action ID

`0xf3a0510b`

### SDK Action

```ts
const aaveV4DelegateWithdrawAction = new dfs.actions.aavev4.AaveV4DelegateWithdrawAction(
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
/// @param spender Address that will receive the withdraw allowance.
/// @param amount Amount of withdraw allowance.
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
emit ActionEvent("AaveV4DelegateWithdraw", logData);
logger.logActionDirectEvent("AaveV4DelegateWithdraw", logData);
bytes memory logData = abi.encode(params);
```
