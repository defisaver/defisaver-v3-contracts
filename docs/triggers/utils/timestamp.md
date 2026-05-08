---
icon: hammer
---

# Timestamp

### Description

Trigger contract that verifies if current timestamp is higher than the one in sub data,

### Trigger ID

`0xa051d9a9`

### SDK Action

```ts
const timestampTrigger = new dfs.triggers.TimestampTrigger(
    nextTimestamp
);
```

### Subscription Parameters

```solidity
/// @param timestamp The next timestamp in which it should trigger
/// @param interval How much to increase the next timestamp after executing strategy
struct SubParams {
    uint256 timestamp;
    uint256 interval;
}
```

### Calldata Parameters

```solidity
None
```

### IsChangeable

`true` changedSubData: new sub-data is created by adding the interval parameter to the timestamp parameter. This is later on updated in the RecipeExecutor and SubStorage.
