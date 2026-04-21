---
icon: hammer
---

# SumInputs

### Description

Helper action to sum up 2 inputs/return values

### Action ID

`0xb49404ac`

### SDK Action

```ts
const sumInputsAction = new dfs.actions.basic.SumInputsAction(
    a,
    b
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param a First input
    /// @param b Second input
    struct Params {
        uint256 a;
        uint256 b;
    }
```

### Return Value

```solidity
return bytes32(a + b)
```

### Events and Logs

```solidity
```
