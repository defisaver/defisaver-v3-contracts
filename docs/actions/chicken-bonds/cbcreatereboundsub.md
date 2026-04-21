---
icon: drumstick
---

# CBCreateReboundSub

### Description

Special action to subscribe to CB Rebond strategy.

### Action ID

`0xa6fede6f`

### SDK Action

```ts
const cBCreateRebondSubAction = new dfs.actions.chickenBonds.CBCreateRebondSubAction(
    bondId
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param bondId Id of the chicken bond NFT we want to sub
    struct Params {
        uint256 bondId;
    }
```

### Return Value

```solidity
```

### Events and Logs

```solidity
```
