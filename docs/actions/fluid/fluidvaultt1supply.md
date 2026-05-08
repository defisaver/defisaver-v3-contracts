---
icon: wave
---

# FluidVaultT1Supply

### Description

Supply assets to Fluid Vault T1 (1\_col:1\_debt)

### Action ID

`0xaf5b03c0`

### SDK Action

```ts
const fluidVaultT1SupplyAction = new dfs.actions.fluid.FluidVaultT1SupplyAction(
    vault,
    nftId,
    amount,
    from,
    collToken
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param vault The address of the Fluid Vault T1
    /// @param nftId ID of the NFT representing the position
    /// @param amount Amount to supply
    /// @param from Address to pull the tokens from
    struct Params {
        address vault;
        uint256 nftId;
        uint256 amount;
        address from;
    }
```

### Return Value

```solidity
return bytes32(amount);
```

### Events and Logs

```solidity
emit ActionEvent("FluidVaultT1Supply", logData);
logger.logActionDirectEvent("FluidVaultT1Supply", logData);
bytes memory logData = abi.encode(params);
```
