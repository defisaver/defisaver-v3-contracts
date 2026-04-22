---
icon: wave
---

# FluidDexRegularBorrow

### Description

Borrow assets from Fluid Vault T2 (2\_col:1\_debt, smart collateral vault)

> This sdk action uses FluidDexBorrow as underlying smart contract.

### Action ID

`0x81fb1de1`

### SDK Action

```ts
const fluidDexRegularBorrowAction = new dfs.actions.fluid.FluidDexRegularBorrowAction(
    vault,
    to,
    nftId,
    borrowAmount,
    wrapBorrowedEth
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

{% hint style="info" %}
SDK will set **BorrowVariableData** as empty for regular borrow action
{% endhint %}

```solidity
    /// @param debtAmount0 Amount of debt token 0 to borrow.
    /// @param debtAmount1 Amount of debt token 1 to borrow.
    /// @param maxDebtShares Max amount of debt shares to mint.
    struct BorrowVariableData {
        uint256 debtAmount0;
        uint256 debtAmount1;
        uint256 maxDebtShares;
    }
    
    /// @param vault The address of the Fluid DEX vault.
    /// @param to Address to send the borrowed assets to.
    /// @param nftId The NFT ID of the position.
    /// @param borrowAmount Amount of debt to borrow. Used if vault is T2.
    /// @param borrowVariableData Variable data for borrow action. Used if vault is T3 or T4.
    /// @param wrapBorrowedEth Whether to wrap the borrowed ETH into WETH if one of the borrowed assets is ETH.
    struct Params {
        address vault;
        address to;
        uint256 nftId;
        uint256 borrowAmount;
        FluidDexModel.BorrowVariableData borrowVariableData;
        bool wrapBorrowedEth;
    }

```

### Return Value

{% hint style="info" %}
For regular borrow action, return value will represent borrowed amount
{% endhint %}

```solidity
return bytes32(borrowAmountOrShares);
```

### Events and Logs

```solidity
emit ActionEvent("FluidDexBorrow", logData);
logger.logActionDirectEvent("FluidDexBorrow", logData);
bytes memory logData = abi.encode(params);
```
