---
icon: drumstick
---

# CBReboundTrigger

### Description

Chicken Bonds trigger when the optimal amount of bLUSD has accrued

### Trigger ID

`0xd39413dc`

### SDK Action

```ts
const cBRebondTrigger = new dfs.triggers.CBRebondTrigger(
    bondID
);
```

### Subscription Parameters

```solidity
/// @param bondID Nft id of the chicken bond
struct SubParams {
    uint256 bondID;
}
```

### Calldata Parameters

```solidity
None
```

### IsChangeable

`false`
