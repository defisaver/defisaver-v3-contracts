---
icon: ghost
---

# AaveV4QuotePriceRangeTrigger

### Description

Trigger contract that verifies if current token price ratio is outside of given range specified during subscription

{% hint style="info" %}
Notes

* The contract computes the base/quote ratio by dividing the oracle prices of the two tokens.
* The trigger expects the `lowerPrice` and `upperPrice` inputs to be scaled by 1e18.
* It is possible to check only one side of the range by setting the other side price to `0`.
* Checks Aave V4 oracle for current prices and triggers if it's in a correct state.
{% endhint %}

### Trigger ID
`0xec27e00e`

### SDK Action
```ts
const aaveV4QuotePriceRangeTrigger = new dfs.triggers.AaveV4QuotePriceRangeTrigger(
    spoke,
    baseTokenId,
    quoteTokenId,
    lowerPrice,
    upperPrice
);
```

### Subscription Parameters
```solidity
/// @param spoke Address of the spoke.
/// @param baseTokenId Reserve id of the base token which is quoted.
/// @param quoteTokenId Reserve id of the quote token.
/// @param lowerPrice Lower price of the base token in terms of the quote token that represents the triggerable point.
/// @param upperPrice Upper price of the base token in terms of the quote token that represents the triggerable point.
struct SubParams {
    address spoke;
    uint256 baseTokenId;
    uint256 quoteTokenId;
    uint256 lowerPrice;
    uint256 upperPrice;
}
```

### Calldata Parameters
```solidity
None
```

### IsChangeable
`false`
