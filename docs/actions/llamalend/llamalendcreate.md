---
icon: rainbow
---

# LlamaLendCreate

### Description

Action that creates a llamalend position on behalf of user's wallet

### Action ID

`0x570f0528`

### SDK Action

```ts
const llamaLendCreateAction = new dfs.actions.llamalend.LlamaLendCreateAction(
    controllerAddress,
    from,
    to,
    collateralAmount,
    debtAmount,
    nBands,
    debtAsset
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param controllerAddress Address of the llamalend market controller
    /// @param from Address from which to pull collateral asset, will default to user's wallet
    /// @param to Address that will receive the borrowed asset
    /// @param collateralAmount Amount of collateral asset to supply
    /// @param debtAmount Amount of debt asset to borrow (does not support uint.max)
    /// @param nBands Number of bands in which the collateral will be supplied
    struct Params {
        address controllerAddress;
        address from;
        address to;
        uint256 collateralAmount;
        uint256 debtAmount;
        uint256 nBands;
    }
```

### Return Value

```solidity
return bytes32(generatedAmount);
```

### Events and Logs

```solidity
emit ActionEvent("LlamaLendCreate", logData);
logger.logActionDirectEvent("LlamaLendCreate", logData);
bytes memory logData = abi.encode(params);
```
