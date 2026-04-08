# ➿ CurveUsdCollRatioTrigger

### Description

Trigger contract that verifies if the CurveUSD position went over/under the subbed ratio

### Trigger ID

`0x3e09367b`

### SDK Action

```ts
const curveUsdCollRatioTrigger = new dfs.triggers.CurveUsdCollRatioTrigger(
    user,
    controller,
    ratio,
    state
);
```

### Subscription Parameters

```solidity
/// @param user address of the user whose position we check
/// @param market CurveUSD controller address
/// @param ratio ratio that represents the triggerable point
/// @param state represents if we want the current state to be higher or lower than ratio param
struct SubParams {
    address user;
    address market;
    uint256 ratio;
    uint8 state;
}
```

### Calldata Parameters

```solidity
None
```

### IsChangeable

`false`
