---
icon: rainbow
---

# LlamaLendLevCreate

### Description

LlamaLendLevCreate

### Action ID

`0xa7dbc75a`

### SDK Action

```ts
const llamaLendLevCreateAction = new dfs.actions.llamalend.LlamaLendLevCreateAction(
    controller,
    controllerId,
    from,
    collAmount,
    nBands,
    exchangeOrder,
    gasUsed
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param controllerAddress Address of the llamalend market controller
    /// @param controllerId id that matches controller number in factory
    /// @param from address from which collAmount of collToken will be pulled
    /// @param collAmount amount of collateral that the user is providing at first
    /// @param nBands number of bands the created position will have
    /// @param exData exchange data for swapping (srcAmount will be amount of debt token generated and sold)
    /// @param gasUsed info for automated strategy gas reimbursement
    struct Params {
        address controllerAddress;
        uint256 controllerId;
        address from;
        uint256 collAmount;
        uint256 nBands;
        DFSExchangeData.ExchangeData exData;
        uint32 gasUsed;
    }
```

### Return Value

```solidity
return bytes32(debtGeneratedAndSold);
```

### Events and Logs

```solidity
emit ActionEvent("LlamaLendLevCreate", logData);
logger.logActionDirectEvent("LlamaLendLevCreate", logData);
bytes memory logData = abi.encode(params);
```
