---
icon: rainbow
---

# LlamaLendSelfLiquidate

### Description

LlamaLendSelfLiquidate Closes the users position while he's in soft liquidation

### Action ID

`0xafcc4eb7`

### SDK Action

```ts
const llamaLendSelfLiquidateAction = new dfs.actions.llamalend.LlamaLendSelfLiquidateAction(
    controllerAddress,
    minDebtAssetExpected,
    from,
    to,
    debtAsset
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param controllerAddress Address of the llamalend market controller
    /// @param minDebtAssetExpected Minimum amount of debt asset as collateral for the user to have
    /// @param from Address from which to pull debt asset if needed
    /// @param to Address that will receive the debt asset and collateral asset
    struct Params {
        address controllerAddress;
        uint256 minDebtAssetExpected;
        address from;
        address to;
    }
```

### Return Value

```solidity
return bytes32(amountPulled);
```

### Events and Logs

```solidity
emit ActionEvent("LlamaLendSelfLiquidate", logData);
logger.logActionDirectEvent("LlamaLendSelfLiquidate", logData);
bytes memory logData = abi.encode(params);
```
