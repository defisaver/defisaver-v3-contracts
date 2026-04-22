---
icon: wave
---

# FluidVaultT1Payback

### Description

Payback debt to Fluid Vault T1 (1\_col:1\_debt)

### Action ID

`0x101b4845`

### SDK Action

```ts
const fluidVaultT1PaybackAction = new dfs.actions.fluid.FluidVaultT1PaybackAction(
    vault,
    nftId,
    amount,
    from,
    debtToken
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param vault The address of the Fluid Vault T1
    /// @param nftId ID of the NFT representing the position
    /// @param amount Amount to payback
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
emit ActionEvent("FluidVaultT1Payback", logData);
logger.logActionDirectEvent("FluidVaultT1Payback", logData);
bytes memory logData = abi.encode(params);
```
