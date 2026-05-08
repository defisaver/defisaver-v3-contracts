---
icon: sigma
---

# EulerV2Borrow

### Description

Borrow assets from Euler vault

### Action ID

`0xbaf1284c`

### SDK Action

```ts
const eulerV2BorrowAction = new dfs.actions.eulerV2.EulerV2BorrowAction(
    vault,
    account,
    receiver,
    amount
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param vault The address of the Euler vault
    /// @param account The address of the Euler account, defaults to user's wallet
    /// @param receiver The address to receive the borrowed assets
    /// @param amount The amount of assets to borrow
    struct Params {
        address vault;
        address account;
        address receiver;
        uint256 amount;
    }
```

### Return Value

```solidity
return bytes32(borrowAmount);
```

### Events and Logs

```solidity
emit ActionEvent("EulerV2Borrow", logData);
logger.logActionDirectEvent("EulerV2Borrow", logData);
bytes memory logData = abi.encode(params);
```
