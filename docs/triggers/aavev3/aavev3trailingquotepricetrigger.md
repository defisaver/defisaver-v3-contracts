---
icon: ghost
---

# AaveV3TrailingQuotePriceTrigger

### Description

Validates trailing stop for quoted asset price

> **Notes**
>
> Given the currentPrice and the maxPrice see if there diff. > than percentage

### Trigger ID

`0x0e31244d`

### SDK Action

```ts
const aaveV3TrailingQuotePriceTrigger = new dfs.triggers.AaveV3TrailingQuotePriceTrigger(
    ...args
);
```

### Subscription Parameters

```solidity
/// @param baseTokenAddr address of the token which is quoted
/// @param baseStartRoundId roundId of the base token feed at time of subscription
/// @param quoteTokenAddr address of the quote token
/// @param quoteStartRoundId roundId of the quote token feed at time of subscription
/// @param percentage price percentage difference on which to trigger
struct SubParams {
    address baseTokenAddr;
    uint80 baseStartRoundId;
    address quoteTokenAddr;
    uint80 quoteStartRoundId;
    uint256 percentage;
}
```

### Calldata Parameters

```solidity
/// @param baseMaxRoundId roundId of the base token feed at time of local maximum
/// @param baseMaxRoundIdNext immediate future neighbour of baseMaxRoundId
/// @param quoteMaxRoundId roundId of the quote token feed at time of local maximum
/// @param quoteMaxRoundIdNext immediate future neighbour of quoteMaxRoundId
/// @dev exactly one *maxRoundIdNext should be 0, signifying the encompassed feed roundId
struct CallParams {
    uint80 baseMaxRoundId;
    uint80 baseMaxRoundIdNext;
    uint80 quoteMaxRoundId;
    uint80 quoteMaxRoundIdNext;
}
```

### IsChangeable

`false`
