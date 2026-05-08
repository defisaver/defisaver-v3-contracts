---
icon: wave
---

# FluidDexSmartCollWithdraw

### Description

Withdraw tokens from Fluid DEX vault (T2, T4)

> This sdk action uses FluidDexWithdraw as underlying smart contract.

### Action ID

`0x4f1673fd`

### SDK Action

```ts
const fluidDexWithdrawAction = new dfs.actions.fluid.FluidDexSmartCollWithdrawAction(
    vault,
    to,
    nftId,
    withdrawVariableData,
    wrapWithdrawnEth
);

```

### Action Type

`STANDARD_ACTION`

### Input Parameters

{% hint style="info" %}
SDK will set **withdrawAmount** as empty for dex withdraw action as that field is only used for regular withdraw (T1,T3), not smart collateral withdraw (T2,T4).&#x20;
{% endhint %}

```solidity
    /// @param collAmount0 Amount of collateral 0 to withdraw.
    /// @param collAmount1 Amount of collateral 1 to withdraw.
    /// @param maxCollShares Max amount of collateral shares to burn. Can be empty for max withdrawal (see minCollToWithdraw)
    /// @param minCollToWithdraw Minimum amount of collateral to withdraw in one token. Only used for max withdrawal, when:
    /// 1. variableData.collAmount0 == type(uint256).max -> all collateral will be withdrawn in coll token0.
    ///    Any existing amount of token1 will be converted to token0 on fluid.
    /// 2. variableData.collAmount1 == type(uint256).max -> all collateral will be withdrawn in coll token1.
    ///    Any existing amount of token0 will be converted to token1 on fluid.
    struct WithdrawVariableData {
        uint256 collAmount0;
        uint256 collAmount1;
        uint256 maxCollShares;
        uint256 minCollToWithdraw;
    }
    
    /// @param vault The address of the Fluid DEX vault.
    /// @param to Address to send the withdrawn assets to.
    /// @param nftId The NFT ID of the position.
    /// @param withdrawAmount Amount of collateral to withdraw. Used if vault is T3.
    /// @param withdrawVariableData Variable data for withdraw action. Used if vault is T2 or T4.
    /// @param wrapWithdrawnEth Whether to wrap the withdrawn ETH into WETH if one of the withdrawn assets is ETH.
    struct Params {
        address vault;
        address to;
        uint256 nftId;
        uint256 withdrawAmount;
        FluidDexModel.WithdrawVariableData withdrawVariableData;
        bool wrapWithdrawnEth;
    }
```

### Return Value

{% hint style="info" %}
For smart collateral withdraw action, return value will represent burned shares
{% endhint %}

```solidity
return bytes32(sharesBurnedOrTokenWithdrawn);
```

### Events and Logs

```solidity
emit ActionEvent("FluidDexWithdraw", logData);
logger.logActionDirectEvent("FluidDexWithdraw", logData);
bytes memory logData = abi.encode(params);
```
