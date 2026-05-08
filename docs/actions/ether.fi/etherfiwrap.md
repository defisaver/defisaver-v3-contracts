---
icon: ethereum
---

# EtherFiWrap

### Description

Wraps eETH into Wrapped eETH (weETH)

### Action ID

`0xfc23725d`

### SDK Action

```ts
const etherFiWrapAction = new dfs.actions.etherfi.EtherFiWrapAction(
    amount,
    from,
    to
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param amount - amount of eETH to pull
    /// @param from - address from which to pull eETH from
    /// @param to - address where received weETH will be sent to
    struct Params {
        uint256 amount;
        address from;
        address to;
    }
```

### Return Value

```solidity
return bytes32(weEthReceivedAmount);
```

### Events and Logs

```solidity
emit ActionEvent("EtherFiWrap", logData);
logger.logActionDirectEvent("EtherFiWrap", logData);
bytes memory logData = abi.encode(params);
```
