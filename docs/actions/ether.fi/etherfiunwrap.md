---
icon: ethereum
---

# EtherFiUnwrap

### Description

Unwrap weETH and receive eETH

### Action ID

`0x6d1f658a`

### SDK Action

```ts
const etherFiUnwrapAction = new dfs.actions.etherfi.EtherFiUnwrapAction(
    amount,
    from,
    to
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param amount - amount of weETH to pull
    /// @param from - address from which to pull weETH from
    /// @param to - address where received eETH will be sent to
    struct Params {
        uint256 amount;
        address from;
        address to;
    }
```

### Return Value

```solidity
return bytes32(eEthReceivedAmount);
```

### Events and Logs

```solidity
emit ActionEvent("EtherFiUnwrap", logData);
logger.logActionDirectEvent("EtherFiUnwrap", logData);
bytes memory logData = abi.encode(params);
```
