---
icon: rainbow
---

# LlamaLendRepay

### Description

LlamaLendRepay

### Action ID

`0x731a2ce5`

### SDK Action

```ts
const llamaLendRepayAction = new dfs.actions.llamalend.LlamaLendRepayAction(
    controller,
    controllerId,
    exchangeOrder,
    to,
    gasUsed
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param controllerAddress Address of the llamalend market controller
    /// @param controllerId id that matches controller number in factory
    /// @param exData exchange data for swapping (srcAmount will be amount of coll token sold)
    /// @param to address which will receive any leftovers if amount received from selling is greater than debt
    /// @param gasUsed info for automated strategy gas reimbursement
    struct Params {
        address controllerAddress;
        uint256 controllerId;
        DFSExchangeData.ExchangeData exData;
        address to;
        uint32 gasUsed;
    }
```

### Return Value

```solidity
return bytes32(debtTokenReceived);
```

### Events and Logs

```solidity
emit ActionEvent("LlamaLendRepay", logData);
logger.logActionDirectEvent("LlamaLendRepay", logData);
bytes memory logData = abi.encode(params);
```
