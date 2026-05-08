---
icon: g
---

# GUniDeposit

### Description

Action that adds liquidity to G-UNI pool of interest (mints G-UNI LP tokens)

### Action ID

`0x1d60df44`

### SDK Action

```ts
const gUniDepositAction = new dfs.actions.guni.GUniDepositAction(
    token0,
    token1,
    amount0Max,
    amount1Max,
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
    /// @param pool address of G-UNI pool to add liquidity to
    /// @param token0 address of token0
    /// @param token1 address of token1
    /// @param amount0Max the maximum amount of token0 msg.sender willing to input
    /// @param amount1Max the maximum amount of token1 msg.sender willing to input
    /// @param amount0Min the minimum amount of token0 actually input (slippage protection)
    /// @param amount1Min the minimum amount of token1 actually input (slippage protection)
    /// @param to account to receive minted G-UNI tokens
    /// @param from account from which to pull underlying tokens from
    struct Params {
        address pool;
        address token0;
        address token1;
        uint256 amount0Max;
        uint256 amount1Max;
        uint256 amount0Min;
        uint256 amount1Min;
        address to;
        address from;
    }
```

### Return Value

```solidity
return bytes32(mintedAmount);
```

### Events and Logs

```solidity
emit ActionEvent("GUniDeposit", logData);
logger.logActionDirectEvent("GUniDeposit", logData);
bytes memory logData = abi.encode(params);
```
