---
icon: l
---

# LidoWrap

### Description

Wraps either WETH or StEth into WrappedStakedEther (WStEth)

### Action ID

`0x43142355`

### SDK Action

```ts
const lidoWrapAction = new dfs.actions.lido.LidoWrapAction(
    amount,
    from,
    to,
    useEth
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param amount - amount to pull
    /// @param from - address from which to pull token from
    /// @param to - address where received WStEth will be sent to
    /// @param useWeth - true for using WETH, false for using stEth
    struct Params {
        uint256 amount;
        address from;
        address to;
        bool useWeth;
    }
```

### Return Value

```solidity
return bytes32(wStEthReceivedAmount);
```

### Events and Logs

```solidity
emit ActionEvent("LidoWrap", logData);
logger.logActionDirectEvent("LidoWrap", logData);
bytes memory logData = abi.encode(params);
```
