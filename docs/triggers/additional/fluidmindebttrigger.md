# FluidMinDebtTrigger

### Description

### Trigger ID

`0xf5ec34f5`

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
/// @param nftId nft id of the fluid position
/// @param minDebt minimum debt in whole USD (no decimals, e.g. 5000 for 5000 USD) that the user must have for the trigger to return true
struct CallDataParams {
    uint256 nftId;
    uint256 minDebt;
}
```

### IsChangeable

`false`
