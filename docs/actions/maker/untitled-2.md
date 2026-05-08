---
icon: m
---

# McdPayback

### Description

Payback dai debt for a Maker vault

### Action ID

`0x43b7daec`

### SDK Action

```ts
const makerPaybackAction = new dfs.actions.maker.MakerPaybackAction(
    vaultId,
    amount,
    from,
    mcdManager
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param _vaultId Id of the vault
    /// @param _amount Amount of dai to be paid back
    /// @param _from Where the Dai is pulled from
    /// @param _mcdManager The manager address we are using
    struct Params {
        uint256 vaultId;
        uint256 amount;
        address from;
        address mcdManager;
    }
```

### Return Value

```solidity
return bytes32(inputData.amount);
```

### Events and Logs

```solidity
emit ActionEvent("McdPayback", logData);
logger.logActionDirectEvent("McdPayback", logData);
bytes memory logData = abi.encode(params);
```
