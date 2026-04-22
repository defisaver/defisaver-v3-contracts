---
icon: sigma
---

# EulerV2Payback

### Description

Payback debt assets to a Euler vault

### Action ID

`0xda58dfbe`

### SDK Action

```ts
const eulerV2PaybackAction = new dfs.actions.eulerV2.EulerV2PaybackAction(
    vault,
    tokenAddress,
    account,
    from,
    amount
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param vault The address of the vault
    /// @param account The address of the Euler account, defaults to user's wallet
    /// @param from The address from which to pull tokens to be paid back
    /// @param amount The amount of assets to pay back (uint256.max for full debt repayment)
    struct Params {
        address vault;
        address account;
        address from;
        uint256 amount;
    }
```

### Return Value

```solidity
return bytes32(paybackAmount);
```

### Events and Logs

```solidity
emit ActionEvent("EulerV2Payback", logData);
logger.logActionDirectEvent("EulerV2Payback", logData);
bytes memory logData = abi.encode(params);
```
