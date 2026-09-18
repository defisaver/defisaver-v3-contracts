---
icon: bluesky
---

# MidnightSupplyCollateral

### Description

Supply collateral to the Midnight market.

### Action ID

`0xbb30ee9a`

### SDK Action

```ts
const midnightSupplyCollateralAction = new dfs.actions.midnight.MidnightSupplyCollateralAction(
    marketId,
    onBehalf,
    from,
    amount,
    collateralIndex
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param marketId Market id.
    /// @param onBehalf Address to supply tokens on behalf of. Defaults to the user's wallet if not provided.
    /// @param from Address from which to pull collateral asset.
    /// @param amount Amount of tokens to supply.
    /// @param collateralIndex Collateral index (0-based).
    struct Params {
        bytes32 marketId;
        address onBehalf;
        address from;
        uint256 amount;
        uint256 collateralIndex;
    }
```

### Return Value

```solidity
return bytes32(amount);
```

### Events and Logs

```solidity
emit ActionEvent("MidnightSupplyCollateral", logData);
logger.logActionDirectEvent("MidnightSupplyCollateral", logData);
bytes memory logData = abi.encode(params);
```
