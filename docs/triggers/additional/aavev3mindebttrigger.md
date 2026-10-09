# AaveV3MinDebtTrigger

### Description

> **Notes**
>
> Total variable debt of `_user` in `_market`, in USD with 8 decimals.

### Trigger ID

`0xb3fa1599`

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
/// @param market aaveV3 market address
/// @param minDebt minimum debt in whole USD (no decimals, e.g. 5000 for 5000 USD) that the user must have for the trigger to return true
struct CalldataParams {
    address user;
    address market;
    uint256 minDebt;
}
```

### IsChangeable

`false`
