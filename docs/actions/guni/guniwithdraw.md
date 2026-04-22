---
icon: g
---

# GUniWithdraw

### Description

Action that removes liquidity from a G-UNI pool and burns G-UNI LP tokens

### Action ID

`0x6b185983`

### SDK Action

```ts
const gUniWithdrawAction = new dfs.actions.guni.GUniWithdrawAction(
    pool,
    burnAmount,
    amount0Min,
    amount1Min,
    to,
    from
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param pool address of G-UNI pool to remove liquidity from
    /// @param burnAmount The number of G-UNI tokens to burn
    /// @param amount0Min Minimum amount of token0 received after burn (slippage protection)
    /// @param amount1Min Minimum amount of token1 received after burn (slippage protection)
    /// @param to The account to receive the underlying amounts of token0 and token1
    /// @param from Account from which to pull G-Uni LP tokens
    struct Params {
        address pool;
        uint256 burnAmount;
        uint256 amount0Min;
        uint256 amount1Min;
        address to;
        address from;
    }
```

### Return Value

```solidity
return bytes32(liquidityBurnt);
```

### Events and Logs

```solidity
emit ActionEvent("GUniWithdraw", logData);
logger.logActionDirectEvent("GUniWithdraw", logData);
bytes memory logData = abi.encode(params);
```
