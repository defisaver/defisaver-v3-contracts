---
icon: sigma
---

# EulerV2PaybackWithShares

### Description

Payback debt asset to a Euler vault using share tokens

### Action ID

`0x0b57c419`

### SDK Action

```ts
const eulerV2PaybackWithSharesAction = new dfs.actions.eulerV2.EulerV2PaybackWithSharesAction(
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
    /// @param vault The address of the vault
    /// @param account The address of the Euler account for which debt is paid back, defaults to user's wallet
    /// @param from The address of the Euler account for which shares are burned to pay back debt for 'account', defaults to user's wallet
    /// @param amount The amount of asset tokens to be paid back (uint256.max for full debt repayment or up to the available deposit shares in 'from' account)
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
emit ActionEvent("EulerV2PaybackWithShares", logData);
logger.logActionDirectEvent("EulerV2PaybackWithShares", logData);
bytes memory logData = abi.encode(params);
```
