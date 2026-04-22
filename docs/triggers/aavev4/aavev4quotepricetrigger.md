---
icon: ghost
---

# AaveV4QuotePriceTrigger

### Description

Trigger contract that verifies if current token price ratio for aaveV4 spoke is over/under a subbed price ratio

### Trigger ID
`0x5aeba3b5`

### SDK Action
```ts
const aaveV4QuotePriceTrigger = new dfs.triggers.AaveV4QuotePriceTrigger(
    spoke,
    baseTokenId,
    quoteTokenId,
    price,
    state
);
```

### Subscription Parameters
```solidity
/// @param spoke Address of the spoke.
/// @param baseTokenId Reserve id of the base token which is quoted.
/// @param quoteTokenId Reserve id of the quote token.
/// @param price Price in quote token of the base token that represents the triggerable point.
/// @param state Represents if we want the current price to be higher or lower than price param.
struct SubParams {
    address spoke;
    uint256 baseTokenId;
    uint256 quoteTokenId;
    uint256 price;
    uint8 state;
}
```

### Calldata Parameters
```solidity
None
```

### IsChangeable
`false`
