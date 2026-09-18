# McdMinDebtTrigger

### Description

### Trigger ID

`0x7c42c776`

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
/// @param cdpId id of the MCD vault (CDP) whose debt we check
/// @param minDebt minimum debt in whole USD (no decimals, e.g. 5000 for 5000 USD) that the user must have for the trigger to return true
struct CalldataParams {
    uint256 cdpId;
    uint256 minDebt;
}
```

### IsChangeable

`false`
