# MorphoBlueMinDebtTrigger

### Description

### Trigger ID

`0xfb4bc110`

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
/// @param marketId bytes32 representing a MorphoBlue market
/// @param minDebt minimum debt in whole USD (no decimals, e.g. 5000 for 5000 USD) that the user must have for the trigger to return true
struct CalldataParams {
    address user;
    Id marketId; // this is bytes32
    uint256 minDebt;
}
```

### IsChangeable

`false`
