---
icon: wave
---

# FluidVaultT1Open

### Description

Open position on Fluid Vault T1 (1\_col:1\_debt)

### Action ID

`0x35b25e65`

### SDK Action

```ts
const fluidVaultT1OpenAction = new dfs.actions.fluid.FluidVaultT1OpenAction(
    vault,
    collAmount,
    debtAmount,
    from,
    to,
    wrapBorrowedEth,
    collToken
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param vault The address of the Fluid Vault T1
    /// @param collAmount Amount of collateral to deposit.
    /// @param debtAmount Amount of debt to borrow. Can be 0 if only depositing collateral.
    /// @param from Address to pull the collateral from.
    /// @param to Address to send the borrowed assets to.
    /// @param wrapBorrowedEth Whether to wrap the borrowed ETH into WETH if the borrowed asset is ETH.
    struct Params {
        address vault;
        uint256 collAmount;
        uint256 debtAmount;
        address from;
        address to;
        bool wrapBorrowedEth;
    }
```

### Return Value

```solidity
return bytes32(nftId);
```

### Events and Logs

```solidity
emit ActionEvent("FluidVaultT1Open", logData);
logger.logActionDirectEvent("FluidVaultT1Open", logData);
bytes memory logData = abi.encode(params);
```
