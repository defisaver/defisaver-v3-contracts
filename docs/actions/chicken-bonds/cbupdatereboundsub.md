---
icon: drumstick
---

# CBUpdateReboundSub

### Description

Special action to update rebond strategy data (Only use in that context)

### Action ID

`0x291d78d0`

### SDK Action

```ts
const cBUpdateRebondSubAction = new dfs.actions.chickenBonds.CBUpdateRebondSubAction(
    subId,
    bondId
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param subId Id of the sub we are changing (user must be owner)
    /// @param bondId Id of the chicken bond NFT we just created
    struct Params {
        uint256 subId;
        uint256 bondId;
    }
```

### Return Value

```solidity
```

### Events and Logs

```solidity
```
