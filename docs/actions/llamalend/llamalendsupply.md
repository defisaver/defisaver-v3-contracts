---
icon: rainbow
---

# LlamaLendSupply

### Description

Action that supplies collateral to a llamalend position

### Action ID

`0x37defe88`

### SDK Action

```ts
const llamaLendSupplyAction = new dfs.actions.llamalend.LlamaLendSupplyAction(
    controllerAddress,
    from,
    onBehalfOf,
    collateralAmount,
    collAsset
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param controllerAddress Address of the llamalend market controller
    /// @param from Address from which to pull collateral asset
    /// @param onBehalfOf Address for which we are supplying, will default to user's wallet
    /// @param collateralAmount Amount of collateral asset to supply
    struct Params {
        address controllerAddress;
        address from;
        address onBehalfOf;
        uint256 collateralAmount;
    }
```

### Return Value

```solidity
return bytes32(suppliedAmount);
```

### Events and Logs

```solidity
emit ActionEvent("LlamaLendSupply", logData);
logger.logActionDirectEvent("LlamaLendSupply", logData);
bytes memory logData = abi.encode(params);
```
