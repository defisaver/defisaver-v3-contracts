---
icon: sigma
---

# EulerV2Withdraw

### Description

Withdraws assets from Euler vault

### Action ID

`0xa6354b21`

### SDK Action

```ts
const eulerV2WithdrawAction = new dfs.actions.eulerV2.EulerV2WithdrawAction(
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
    /// @param receiver The address to receive the withdrawn assets
    /// @param amount The amount of assets to withdraw (uint256.max for max withdrawal)
    struct Params {
        address vault;
        address account;
        address receiver;
        uint256 amount;
    }
```

### Return Value

```solidity
return bytes32(withdrawAmount);
```

### Events and Logs

```solidity
emit ActionEvent("EulerV2Withdraw", logData);
logger.logActionDirectEvent("EulerV2Withdraw", logData);
bytes memory logData = abi.encode(params);
```
