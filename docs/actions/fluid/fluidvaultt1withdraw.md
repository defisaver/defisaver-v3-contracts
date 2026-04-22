---
icon: wave
---

# FluidVaultT1Withdraw

### Description

Withdraw assets from Fluid Vault T1 (1\_col:1\_debt)

### Action ID

`0xf304b35f`

### SDK Action

```ts
const fluidVaultT1WithdrawAction = new dfs.actions.fluid.FluidVaultT1WithdrawAction(
    vault,
    nftId,
    amount,
    to,
    wrapWithdrawnEth
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param vault The address of the Fluid Vault T1
    /// @param nftId ID of the NFT representing the position
    /// @param amount Amount to withdraw. Pass type(uint256).max to withdraw all.
    /// @param to Address to send the withdrawn assets to
    /// @param wrapWithdrawnEth Whether to wrap the withdrawn ETH into WETH if the withdrawn asset is ETH.
    struct Params {
        address vault;
        uint256 nftId;
        uint256 amount;
        address to;
        bool wrapWithdrawnEth;
    }
```

### Return Value

```solidity
return bytes32(amount);
```

### Events and Logs

```solidity
emit ActionEvent("FluidVaultT1Withdraw", logData);
logger.logActionDirectEvent("FluidVaultT1Withdraw", logData);
bytes memory logData = abi.encode(params);
```
