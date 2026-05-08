---
icon: hammer
---

# SubInputs

### Description

Helper action to subtract 2 inputs/return values

### Action ID

`0x2f36fd35`

### SDK Action

```ts
const subInputsAction = new dfs.actions.basic.SubInputsAction(
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
return bytes32(a - b)
```

### Events and Logs

```solidity
```
