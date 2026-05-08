---
icon: wave
---

# FluidDexRegularSupply

### Description

Supply assets to Fluid Vault T3 (1\_col:2\_debt, smart debt vault)

> This sdk action uses FluidDexSupply as underlying smart contract.

### Action ID

`0x3cf3e466`

### SDK Action

```ts
const fluidDexRegularSupplyAction = new dfs.actions.fluid.FluidDexRegularSupplyAction(
    vault,
    from,
    nftId,
    supplyAmount,
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

{% hint style="info" %}
SDK will set **SupplyVariableData** as empty for regular supply action
{% endhint %}

```solidity
    /// @notice Data struct for supplying liquidity to a Fluid DEX
    /// @param vault Address of the vault
    /// @param vaultType Type of the vault. For supply, it will be T2 or T4
    /// @param nftId NFT id of the position
    /// @param from Address to pull the tokens from
    /// @param variableData Data for supplying liquidity with variable amounts
    struct SupplyDexData {
        address vault;
        uint256 vaultType;
        uint256 nftId;
        address from;
        SupplyVariableData variableData;
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
For regular supply action, return value will represent supplied amount
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
