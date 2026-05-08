---
icon: ethereum
---

# LSVSupply

### Description

action for tracking users supply within the LSV ecosystem

### Action ID

`0x2b24ec36`

### SDK Action

```ts
const lSVSupplyAction = new dfs.actions.lsv.LSVSupplyAction(
    protocol,
    token,
    amount
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param protocol - an ID representing the protocol in LSVProfitTracker
    /// @param token - token which is being supplied to the protocol
    /// @param amount - amount of token being supplied
    struct Params {
        uint256 protocol;
        address token;
        uint256 amount;
    }
```

### Return Value

```solidity
return bytes32(amountSentToTracker);
```

### Events and Logs

```solidity
emit ActionEvent("LSVSupply", logData);
logger.logActionDirectEvent("LSVSupply", logData);
bytes memory logData = abi.encode(params);
```
