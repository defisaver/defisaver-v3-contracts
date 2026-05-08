---
icon: bluesky
---

# MorphoBlueReallocateLiquidity

### Description

Action that bundles calls to Morpho Blue Public Allocator to reallocate liquidity for additional borrowing

### Action ID

`0x75852bc7`

### SDK Action

```ts
const morphoBlueReallocateLiquidityAction = new dfs.actions.morpho-blue.MorphoBlueReallocateLiquidityAction(
    loanToken,
    collateralToken,
    oracle,
    irm,
    lltv,
    vaults,
    withdrawals
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param marketParams Market params for the Morpho Blue market where liquidity will be reallocated to.
    /// @param vaults List of vaults used for reallocation.
    /// @param withdrawals List of withdrawals for each vault.
    struct Params {
        MarketParams marketParams;
        address[] vaults;
        Withdrawal[][] withdrawals;
    }
```

### Return Value

```solidity
return bytes32(0);
```

### Events and Logs

```solidity
emit ActionEvent("MorphoBlueReallocateLiquidity", logData);
logger.logActionDirectEvent("MorphoBlueReallocateLiquidity", logData);
bytes memory logData = abi.encode(params);
```
