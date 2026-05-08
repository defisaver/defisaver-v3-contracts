---
icon: wave
---

# FluidDexSmartCollSupply

### Description

Supply tokens to Fluid DEX vault with smart collateral (T2, T4)

> This sdk action uses FluidDexSupply as underlying smart contract.

### Action ID

`0x3cf3e466`

### SDK Action

```ts
const fluidDexSupplyAction = new dfs.actions.fluid.FluidDexSmartCollSupplyAction(
    vault,
    from,
    nftId,
    supplyVariableData
);

```

### Action Type

`STANDARD_ACTION`

### Input Parameters

> SDK will set **supplyAmount** as empty for dex supply action as that field is only used for regular supply (T1,T3), not smart collateral (T2,T4).&#x20;

```solidity
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
    /// @param nftId The NFT ID of the position.
    /// @param supplyAmount Amount of collateral to deposit. Used if vault is T3.
    /// @param supplyVariableData Variable data for supply action. Used if vault is T2 or T4.
    struct Params {
        address vault;
        address from;
        uint256 nftId;
        uint256 supplyAmount;
        FluidDexModel.SupplyVariableData supplyVariableData;
    }
```

### Return Value

{% hint style="info" %}
For smart collateral supply action, return value will represent minted shares
{% endhint %}

```solidity
return bytes32(supplyAmountOrShares);
```

### Events and Logs

```solidity
emit ActionEvent("FluidDexSupply", logData);
logger.logActionDirectEvent("FluidDexSupply", logData);
bytes memory logData = abi.encode(params);
```
