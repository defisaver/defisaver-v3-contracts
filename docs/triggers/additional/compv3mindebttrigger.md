# CompV3MinDebtTrigger

### Description

### Trigger ID

`0xc71e2aae`

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
/// @param market address of the compoundV3 market
/// @param minDebt minimum debt in whole USD (no decimals, e.g. 5000 for 5000 USD) that the user must have for the trigger to return true
struct CalldataParams {
    address user;
    address market;
    uint256 minDebt;
}

```

### IsChangeable

`false`
