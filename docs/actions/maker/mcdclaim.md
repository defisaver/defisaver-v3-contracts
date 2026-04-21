---
icon: m
---

# McdClaim

### Description

Claims bonus tokens in CropJoin type vaults

> **Notes**
>
> The call will revert if the \_joinAddr is not CropJoin compatible

### Action ID

`0xcc6e4b36`

### SDK Action

```ts
const makerClaimAction = new dfs.actions.maker.MakerClaimAction(
    vaultId,
    joinAddr,
    to
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param vaultId Id of the vault
    /// @param joinAddr Join address of the maker collateral
    /// @param to Address where to send the bonus tokens we withdrew
    struct Params {
        uint256 vaultId;
        address joinAddr;
        address to;
    }
```

### Return Value

```solidity
return bytes32(returnAmount);
```

### Events and Logs

```solidity
emit ActionEvent("McdClaim", logData);
logger.logActionDirectEvent("McdClaim", logData);
bytes memory logData = abi.encode(params);
```
