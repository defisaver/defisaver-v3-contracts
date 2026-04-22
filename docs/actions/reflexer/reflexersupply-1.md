---
icon: reflect-horizontal
---

# ReflexerSupply

### Description

Supply collateral to a Reflexer safe

### Action ID

`0x1b6b9da7`

### SDK Action

```ts
const reflexerSupplyAction = new dfs.actions.reflexer.ReflexerSupplyAction(
    safeId,
    amount,
    adapterAddr,
    from
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param safeId Id of the safe
    /// @param amount Amount of tokens to supply
    /// @param adapterAddr Adapter address of the reflexer collateral
    /// @param from Address where to pull the collateral from
    struct Params {
        uint256 safeId;
        uint256 amount;
        address adapterAddr;
        address from;
    }
```

### Return Value

```solidity
return bytes32(returnAmount);
```

### Events and Logs

```solidity
emit ActionEvent("ReflexerSupply", logData);
logger.logActionDirectEvent("ReflexerSupply", logData);
bytes memory logData = abi.encode(params);
```
