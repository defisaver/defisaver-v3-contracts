---
icon: wave
---

# FluidDexRegularPayback

### Description

Payback debt to Fluid Vault T2 (2\_col:1\_debt, smart collateral vault)

> This sdk action uses FluidDexPayback as underlying smart contract.

### Action ID

`0x1de2c822`

### SDK Action

```ts
const fluidDexRegularPaybackAction = new dfs.actions.fluid.FluidDexRegularPaybackAction(
    vault,
    from,
    nftId,
    paybackAmount
);
```

### Action Type

`STANDARD_ACTION`&#x20;

### Input Parameters

{% hint style="info" %}
SDK will set **PaybackVariableData** as empty for regular payback action
{% endhint %}

```solidity
    /// @param debtAmount0 Amount of debt token 0 to payback.
    /// @param debtAmount1 Amount of debt token 1 to payback.
    /// @param minDebtShares Min amount of debt shares to burn. Can be empty for max payback (see maxAmountToPull)
    /// @param maxAmountToPull Maximum amount of debt token to pull from the user. Only used for max payback when:
    /// 1. variableData.debtAmount0 == type(uint256).max -> all debt will be paid back in debt token0.
    ///    Any existing amount of debt token1 will be converted to debt token0 on fluid.
    /// 2. variableData.debtAmount1 == type(uint256).max -> all debt will be paid back in debt token1.
    ///    Any existing amount of debt token0 will be converted to debt token1 on fluid.
    struct PaybackVariableData {
        uint256 debtAmount0;
        uint256 debtAmount1;
        uint256 minDebtShares;
        uint256 maxAmountToPull;
    }
    
    /// @param vault The address of the Fluid DEX vault.
    /// @param from Address to pull the debt tokens from.
    /// @param nftId The NFT ID of the position.
    /// @param paybackAmount The amount of debt to payback. Used if vault is T2.
    /// @param paybackVariableData Variable data for payback action. Used if vault is T3 or T4.
    struct Params {
        address vault;
        address from;
        uint256 nftId;
        uint256 paybackAmount;
        FluidDexModel.PaybackVariableData paybackVariableData;
    }
```

### Return Value

{% hint style="info" %}
For regular payback action, return value will represent payback amount
{% endhint %}

```solidity
return bytes32(paybackAmountOrBurnedShares);
```

### Events and Logs

```solidity
emit ActionEvent("FluidDexPayback", logData);
logger.logActionDirectEvent("FluidDexPayback", logData);
bytes memory logData = abi.encode(params);
```
