# SparkMinDebtTrigger

### Description

### Trigger ID

`0x999d767e`

### SDK Action

```ts
None
```

### Subscription Parameters

```solidity
None
```

### Calldata Parameters

```solidity
/// @param user address of the user whose position we check
/// @param minDebt minimum debt in whole USD (no decimals, e.g. 5000 for 5000 USD) that the user must have for the trigger to return true
struct CalldataParams {
    address user;
    uint256 minDebt;
}
```

### IsChangeable

`false`
