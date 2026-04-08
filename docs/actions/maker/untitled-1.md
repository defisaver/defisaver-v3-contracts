---
icon: m
---

# McdWithdraw

### Description

Withdraws collateral from a Maker vault

### Action ID

`0xfd5383d0`

### SDK Action

```ts
const makerWithdrawAction = new dfs.actions.maker.MakerWithdrawAction(
    vaultId,
    amount,
    joinAddr,
    to,
    mcdManager
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param vaultId Id of the vault
    /// @param amount Amount of collateral to withdraw
    /// @param joinAddr Join address of the maker collateral
    /// @param to Address where to send the collateral we withdrew
    /// @param mcdManager The manager address we are using [mcd, b.protocol]
    struct Params {
        uint256 vaultId;
        uint256 amount;
        address joinAddr;
        address to;
        address mcdManager;
    }
```

### Return Value

```solidity
return bytes32(withdrawnAmount);
```

### Events and Logs

```solidity
emit ActionEvent("McdWithdraw", logData);
logger.logActionDirectEvent("McdWithdraw", logData);
bytes memory logData = abi.encode(params);
```
