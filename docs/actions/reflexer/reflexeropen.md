---
icon: reflect-horizontal
---

# ReflexerOpen

### Description

Open a new Reflexer safe

### Action ID

`0xf26b3b00`

### SDK Action

```ts
const reflexerOpenSafeAction = new dfs.actions.reflexer.ReflexerOpenSafeAction(
    adapterAddr
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param adapterAddr Address of the adapter
    struct Params {
        address adapterAddr;
    }
```

### Return Value

```solidity
return bytes32(newSafeId);
```

### Events and Logs

```solidity
emit ActionEvent("ReflexerOpen", logData);
logger.logActionDirectEvent("ReflexerOpen", logData);
bytes memory logData = abi.encode(params);
```

