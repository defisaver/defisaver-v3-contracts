---
icon: m
---

# McdGenerate

### Description

Generate dai from a Maker Vault

### Action ID

`0xad463b00`

### SDK Action

```ts
const makerGenerateAction = new dfs.actions.maker.MakerGenerateAction(
    vaultId,
    amount,
    to,
    mcdManager
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param vaultId Id of the vault
    /// @param amount Amount of dai to be generated
    /// @param to Address which will receive the dai
    /// @param mcdManager The manager address we are using [mcd, b.protocol]
    struct Params {
        uint256 vaultId;
        uint256 amount;
        address to;
        address mcdManager;
    }
```

### Return Value

```solidity
return bytes32(borrowedAmount);
```

### Events and Logs

```solidity
emit ActionEvent("McdGenerate", logData);
logger.logActionDirectEvent("McdGenerate", logData);
bytes memory logData = abi.encode(params);
```
