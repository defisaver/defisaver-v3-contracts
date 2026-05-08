---
icon: hammer
---

# SDaiUnwrap

### Description

Action that redeems sDai for dai.

### Action ID

`0xeafe8383`

### SDK Action

```ts
const sDaiUnwrapAction = new dfs.actions.basic.SDaiUnwrapAction(
    amount,
    from,
    to
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param amount - Amount of sDai to redeem
    /// @param from - Address from which the tokens will be pulled
    /// @param to - Address that will receive the dai
    struct Params {
        uint256 amount;
        address from;
        address to;
    }
```

### Return Value

```solidity
return bytes32(daiAmount);
```

### Events and Logs

```solidity
emit ActionEvent("SDaiUnwrap", logData);
logger.logActionDirectEvent("SDaiUnwrap", logData);
bytes memory logData = abi.encode(params);
```
