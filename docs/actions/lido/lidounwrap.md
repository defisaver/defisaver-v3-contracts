---
icon: l
---

# LidoUnwrap

### Description

Unwrap WStEth and receive StEth

### Action ID

`0xacd039ef`

### SDK Action

```ts
const lidoUnwrapAction = new dfs.actions.lido.LidoUnwrapAction(
    amount,
    from,
    to
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param amount - amount of WStEth to pull
    /// @param from - address from which to pull WStEth from
    /// @param to - address where received stETH will be sent to
    struct Params {
        uint256 amount;
        address from;
        address to;
    }
```

### Return Value

```solidity
return bytes32(stEthReceivedAmount);
```

### Events and Logs

```solidity
emit ActionEvent("LidoUnwrap", logData);
logger.logActionDirectEvent("LidoUnwrap", logData);
bytes memory logData = abi.encode(params);
```
