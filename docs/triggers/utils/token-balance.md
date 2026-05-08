---
icon: hammer
---

# Token Balance

### Description

Trigger contract that checks if a certain condition regarding users token amount are true

### Trigger ID

`0x3bedf030`

### SDK Action

```ts
const tokenBalanceTrigger = new dfs.triggers.TokenBalanceTrigger(
    ...args
);
```

### Subscription Parameters

```solidity
/// @param tokenAddr address of the token
/// @param userAddr address of the user whose balance we want to check
/// @param targetBalance amount that represents the triggerable point
/// @param state represents if we want the current balance to be higher, lower or equal to targetBalance
struct SubParams {
    address tokenAddr;
    address userAddr;
    uint256 targetBalance;
    uint8 state;
}
```

### Calldata Parameters

```solidity
None
```

### IsChangeable

`false`
