# AaveV3BoostCollateralTrigger

### Description

Additional trigger that triggers only if the user's Aave V3 position contains at least one non-LTV0 collateral asset.

### Trigger ID

`0xb03dd233`

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
/// @param user Account holding the Aave position (smart wallet or EOA).
/// @param market Aave V3 PoolAddressesProvider for the position's market.
struct CalldataParams {
    address user;
    address market;
}
```

### IsChangeable

`false`
