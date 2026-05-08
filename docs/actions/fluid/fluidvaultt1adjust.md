---
icon: wave
---

# FluidVaultT1Adjust

### Description

Adjust position on Fluid Vault T1 (1\_col:1\_debt)

### Action ID

`0xce25def6`

### SDK Action

```ts
const fluidVaultT1AdjustAction = new dfs.actions.fluid.FluidVaultT1AdjustAction(
    vault,
    nftId,
    collAmount,
    debtAmount,
    from,
    to,
    sendWrappedEth,
    collAction,
    debtAction
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param vault Address of the Fluid Vault T1
    /// @param nftId ID of the NFT representing the position
    /// @param collAmount Amount of collateral to supply/withdraw. In case of max withdraw, use type(uint256).max
    /// @param debtAmount Amount of debt to payback/borrow. In case of max payback, use type(uint256).max
    /// @param from Address to pull tokens from
    /// @param to Address to send tokens to
    /// @param sendWrappedEth Whether to wrap the ETH into WETH before sending to 'to' address
    /// @param collAction Type of collateral action to perform. 0 for supply, 1 for withdraw
    /// @param debtAction Type of debt action to perform. 0 for payback, 1 for borrow
    struct Params {
        address vault;
        uint256 nftId;
        uint256 collAmount;
        uint256 debtAmount;
        address from;
        address to;
        bool sendWrappedEth;
        CollActionType collAction;
        DebtActionType debtAction;
    }
```

### Return Value

```solidity
return bytes32(debtAmount);
```

### Events and Logs

```solidity
emit ActionEvent("FluidVaultT1Adjust", logData);
logger.logActionDirectEvent("FluidVaultT1Adjust", logData);
bytes memory logData = abi.encode(params);
```
