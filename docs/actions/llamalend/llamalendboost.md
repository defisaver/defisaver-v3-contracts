---
icon: rainbow
---

# LlamaLendBoost

### Description

LlamaLendBoost

### Action ID

`0xe339d237`

### SDK Action

```ts
const llamaLendBoostAction = new dfs.actions.llamalend.LlamaLendBoostAction(
    controller,
    controllerId,
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
    /// @param exData exchange data for swapping (srcAmount will be amount of debt generated)
    /// @param gasUsed info for automated strategy gas reimbursement
    struct Params {
        address controllerAddress;
        uint256 controllerId;
        DFSExchangeData.ExchangeData exData;
        uint32 gasUsed;
    }
```

### Return Value

```solidity
return bytes32(generatedAmount);
```

### Events and Logs

```solidity
emit ActionEvent("LlamaLendBoost", logData);
logger.logActionDirectEvent("LlamaLendBoost", logData);
bytes memory logData = abi.encode(params);
```
