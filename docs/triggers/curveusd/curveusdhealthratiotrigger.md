# ➿ CurveUsdHealthRatioTrigger

### Description

Trigger contract that verifies if the CurveUSD position health ratio went under the subbed ratio

### Trigger ID

`0xbcde585a`

### SDK Action

```ts
const curveUsdHealthRatioTrigger = new dfs.triggers.CurveUsdHealthRatioTrigger(
    user,
    controller,
    ratio
);
```

### Subscription Parameters

```solidity
/// @param user address of the user whose position we check
/// @param market CurveUSD controller address
/// @param ratio ratio that represents the triggerable point
struct SubParams {
    address user;
    address market;
    uint256 ratio;
}
```

### Calldata Parameters

```solidity
None
```

### IsChangeable

`false`
