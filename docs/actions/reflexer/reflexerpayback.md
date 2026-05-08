---
icon: reflect-horizontal
---

# ReflexerPayback

### Description

Payback rai debt for a reflexer safe

### Action ID

`0xb7460335`

### SDK Action

```ts
const reflexerPaybackAction = new dfs.actions.reflexer.ReflexerPaybackAction(
    safeId,
    amount,
    from
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param safeId Id of the safe
    /// @param amount Amount of rai to be paid back
    /// @param from Address which will send the rai
    struct Params {
        uint256 safeId;
        uint256 amount;
        address from;
    }
```

### Return Value

```solidity
return bytes32(repayAmount);
```

### Events and Logs

```solidity
emit ActionEvent("ReflexerPayback", logData);
logger.logActionDirectEvent("ReflexerPayback", logData);
bytes memory logData = abi.encode(params);
```
