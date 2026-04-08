---
icon: wave
---

# FluidDexSmartDebtBorrow

### Description

Borrow tokens from Fluid DEX vault (T3, T4)

### Action ID

`0x81fb1de1`

### SDK Action

```ts
const fluidDexBorrowAction = new dfs.actions.fluid.FluidDexSmartDebtBorrowAction(
    vault,
    to,
    nftId,
    borrowVariableData,
    wrapBorrowedEth
);

```

### Action Type

`STANDARD_ACTION`

### Input Parameters

{% hint style="info" %}
SDK will set **borrowAmount** as empty for dex borrow action as that field is only used for regular borrow (T1,T2), not smart debt (T3,T4).&#x20;
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
For smart debt borrow action, return value will represent minted borrow shares
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
