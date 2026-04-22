---
icon: rainbow
---

# LlamaLendBorrow

### Description

Action that borrows asset from user's wallet llamalend position

### Action ID

`0x03aadd81`

### SDK Action

```ts
const llamaLendBorrowAction = new dfs.actions.llamalend.LlamaLendBorrowAction(
    controllerAddress,
    to,
    debtAmount
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param controllerAddress Address of the llamalend market controller
    /// @param to Address that will receive the borrowed asset, will default to user's wallet
    /// @param debtAmount Amount of debt asset to borrow (does not support uint.max)
    struct Params {
        address controllerAddress;
        address to;
        uint256 debtAmount;
    }
```

### Return Value

```solidity
return bytes32(generatedAmount);
```

### Events and Logs

```solidity
emit ActionEvent("LlamaLendBorrow", logData);
logger.logActionDirectEvent("LlamaLendBorrow", logData);
bytes memory logData = abi.encode(params);
```
