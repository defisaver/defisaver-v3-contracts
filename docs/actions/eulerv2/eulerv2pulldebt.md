---
icon: sigma
---

# EulerV2PullDebt

### Description

Pull debt from one Euler account to another

### Action ID

`0x2ed8fb7f`

### SDK Action

```ts
const eulerV2PullDebtAction = new dfs.actions.eulerV2.EulerV2PullDebtAction(
    vault,
    account,
    from,
    amount
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param vault The address of the Euler vault
    /// @param account The address of the Euler account taking the debt, defaults to user's wallet
    /// @param from The address of the Euler account from which debt is pulled
    /// @param amount The amount of debt to be pulled (uint256.max for full debt pull)
    struct Params {
        address vault;
        address account;
        address from;
        uint256 amount;
    }
```

### Return Value

```solidity
return bytes32(pulledDebtAmount);
```

### Events and Logs

```solidity
emit ActionEvent("EulerV2PullDebt", logData);
logger.logActionDirectEvent("EulerV2PullDebt", logData);
bytes memory logData = abi.encode(params);
```
