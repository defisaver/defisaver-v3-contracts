---
icon: bluesky
---

# MorphoTokenWrap

### Description

Wraps Legacy MORPHO token to new Wrapped MORPHO token

### Action ID

`0x8b09e29d`

### SDK Action

```ts
const morphoTokenWrapAction = new dfs.actions.morpho-blue.MorphoTokenWrapAction(
    to,
    amount
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param to The address to which to send the new Wrapped MORPHO tokens
    /// @param amount The amount of Legacy MORPHO tokens to wrap, if type(uint256).max wraps whole wallet balance
    struct Params {
        address to;
        uint256 amount;
    }
```

### Return Value

```solidity
return bytes32(amount);
```

### Events and Logs

```solidity
emit ActionEvent("MorphoTokenWrap", logData);
logger.logActionDirectEvent("MorphoTokenWrap", logData);
bytes memory logData = abi.encode(params);
```
