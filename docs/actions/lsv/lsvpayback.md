---
icon: ethereum
---

# LSVPayback

### Description

action for tracking users paybacks within the LSV ecosystem

### Action ID

`0x3179400b`

### SDK Action

```ts
const lSVPaybackAction = new dfs.actions.lsv.LSVPaybackAction(
    protocol,
    amount
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param protocol - an ID representing the protocol in LSVProfitTracker
    /// @param amount - amount of token being paid back
    struct Params {
        uint256 protocol;
        uint256 amount;
    }
```

### Return Value

```solidity
return bytes32(inputData.amount);
```

### Events and Logs

```solidity
emit ActionEvent("LSVPayback", logData);
logger.logActionDirectEvent("LSVPayback", logData);
bytes memory logData = abi.encode(params);
```
