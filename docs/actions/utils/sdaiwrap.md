---
icon: hammer
---

# SDaiWrap

### Description

Action that deposits dai into sDai.

### Action ID

`0xf7fc13f2`

### SDK Action

```ts
const sDaiWrapAction = new dfs.actions.basic.SDaiWrapAction(
    amount,
    from,
    to
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param amount - Amount of dai to deposit
    /// @param from - Address from which the tokens will be pulled
    /// @param to - Address that will receive the sDai
    struct Params {
        uint256 amount;
        address from;
        address to;
    }
```

### Return Value

```solidity
return bytes32(shares);
```

### Events and Logs

```solidity
emit ActionEvent("SDaiWrap", logData);
logger.logActionDirectEvent("SDaiWrap", logData);
bytes memory logData = abi.encode(params);
```
