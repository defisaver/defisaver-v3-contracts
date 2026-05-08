---
icon: wave
---

# FluidVaultT1Borrow

### Description

Borrow assets from Fluid Vault T1 (1\_col:1\_debt)

### Action ID

`0x237b3650`

### SDK Action

```ts
const fluidVaultT1BorrowAction = new dfs.actions.fluid.FluidVaultT1BorrowAction(
    vault,
    nftId,
    amount,
    to,
    wrapBorrowedEth
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param vault The address of the Fluid Vault T1
    /// @param nftId ID of the NFT representing the position
    /// @param amount Amount to borrow
    /// @param to Address to send the borrowed assets to
    /// @param wrapBorrowedEth Whether to wrap the borrowed ETH into WETH if the borrowed asset is ETH.
    struct Params {
        address vault;
        uint256 nftId;
        uint256 amount;
        address to;
        bool wrapBorrowedEth;
    }
```

### Return Value

```solidity
return bytes32(amount);
```

### Events and Logs

```solidity
emit ActionEvent("FluidVaultT1Borrow", logData);
logger.logActionDirectEvent("FluidVaultT1Borrow", logData);
bytes memory logData = abi.encode(params);
```
