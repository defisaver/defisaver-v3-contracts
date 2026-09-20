# LiquityMinDebtTrigger

### Description

Additional trigger that triggers only if the debt of the user's Liquity trove is above the defined limit set by the backend automation system.

### Trigger ID

`0x15cb8c0f`

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
/// @param user Owner of the Liquity V1 trove.
/// @param minDebt minimum debt in whole USD (no decimals, e.g. 5000 for 5000 USD) that the user must have for the trigger to return true
struct CalldataParams {
    address user;
    uint256 minDebt;
}
```

### IsChangeable

`false`
