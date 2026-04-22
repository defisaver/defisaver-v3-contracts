---
icon: m
---

# McdSupply

### Description

Supply collateral to a Maker vault

### Action ID

`0xa173f4ab`

### SDK Action

```ts
const makerSupplyAction = new dfs.actions.maker.MakerSupplyAction(
    vaultId,
    amount,
    joinAddr,
    from,
    mcdManager
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param vaultId Id of the vault
    /// @param amount Amount of tokens to supply
    /// @param joinAddr Join address of the maker collateral
    /// @param from Address where to pull the collateral from
    /// @param mcdManager The manager address we are using [mcd, b.protocol]
    struct Params {
        uint256 vaultId;
        uint256 amount;
        address joinAddr;
        address from;
        address mcdManager;
    }
```

### Return Value

```solidity
return bytes32(returnAmount);
```

### Events and Logs

```solidity
emit ActionEvent("McdSupply", logData);
logger.logActionDirectEvent("McdSupply", logData);
bytes memory logData = abi.encode(params);
```
