---
icon: wave
---

# FluidDexOpen

### Description

Open position on Fluid DEX vault (T2, T3, T4)

### Action ID

`0x7d4e6bb2`

### SDK Action

```ts
const fluidDexOpenAction = new dfs.actions.FluidDexOpenAction(
    vault,
    from,
    to,
    supplyAmount,
    supplyVariableData,
    borrowAmount,
    borrowVariableData,
    wrapBorrowedEth
);

```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param debtAmount0 Amount of debt token 0 to borrow.
    /// @param debtAmount1 Amount of debt token 1 to borrow.
    /// @param maxDebtShares Max amount of debt shares to mint.
    struct BorrowVariableData {
        uint256 debtAmount0;
        uint256 debtAmount1;
        uint256 maxDebtShares;
    }
    
    /// @param collAmount0 Amount of collateral 0 to deposit.
    /// @param collAmount1 Amount of collateral 1 to deposit.
    /// @param minCollShares Min amount of collateral shares to mint.
    struct SupplyVariableData {
        uint256 collAmount0;
        uint256 collAmount1;
        uint256 minCollShares;
    }
    
    /// @param vault The address of the Fluid DEX vault.
    /// @param from Address to pull the collateral from.
    /// @param to Address to send the borrowed assets to.
    /// @param supplyAmount Amount of collateral to deposit. Used if vault is T3.
    /// @param supplyVariableData Variable data for supply action. Used if vault is T2 or T4.
    /// @param borrowAmount Amount of debt to borrow. Can be empty. Used if vault is T2.
    /// @param borrowVariableData Variable data for borrow action. Can be empty. Used if vault is T3 or T4.
    /// @param wrapBorrowedEth Whether to wrap the borrowed ETH into WETH if one of the borrowed assets is ETH.
    struct Params {
        address vault;
        address from;
        address to;
        uint256 supplyAmount;
        FluidDexModel.SupplyVariableData supplyVariableData;
        uint256 borrowAmount;
        FluidDexModel.BorrowVariableData borrowVariableData;
        bool wrapBorrowedEth;
    }
```

### Return Value

```solidity
return bytes32(nftId);
```

### Events and Logs

```solidity
emit ActionEvent("FluidDexOpen", logData);
logger.logActionDirectEvent("FluidDexOpen", logData);
bytes memory logData = abi.encode(params);
```
