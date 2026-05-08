---
icon: rainbow
---

# LlamaLendSelfLiquidateWithColl

### Description

LlamaLendSelfLiquidateWithColl

### Action ID

`0x74ba5125`

### SDK Action

```ts
const llamaLendSelfLiquidateWithCollAction = new dfs.actions.llamalend.LlamaLendSelfLiquidateWithCollAction(
    controller,
    controllerId,
    percentage,
    minCrvUsdExpected,
    exchangeOrder,
    to,
    sellAllCollateral,
    gasUsed
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param controllerAddress Address of the curveusd market controller
    /// @param controllerId id that matches controller number in factory
    /// @param percentage Fraction to liquidate; 100% = 10**18
    /// @param minCrvUsdExpected Users crvUsd collateral balance must be bigger than this
    /// @param exData exchange data for swapping (srcAmount will be amount of coll token sold)
    /// @param to Where to send the leftover funds if full close
    /// @param sellAllCollateral Since coll token amount is changeable during soft liquidation, this will replace srcAmount in exData with coll amount
    /// @param gasUsed Only used as part of a strategy, estimated gas used for this tx
    struct Params {
        address controllerAddress;
        uint256 controllerId;
        uint256 minCrvUsdExpected;
        DFSExchangeData.ExchangeData exData;
        address to;
        bool sellAllCollateral;
        uint32 gasUsed;
    }
```

### Return Value

```solidity
return bytes32(generatedAmount);
```

### Events and Logs

```solidity
emit ActionEvent("LlamaLendSelfLiquidateWithColl", logData);
logger.logActionDirectEvent("LlamaLendSelfLiquidateWithColl", logData);
bytes memory logData = abi.encode(params);
```
