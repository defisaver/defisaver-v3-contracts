---
icon: pegasus
---

# UniCreatePoolV3

### Description

Action for creating Uniswap V3 Pool and minting a position in it after that

> **Notes**
>
> If pool already exists, it will only mint a position in pool.
>
> The address from which we're pulling token0 and token1 must approve proxy.
>
> If amount0Desired or amount1Desired is uint.max this will pull whole balance of \_from.
>
> Mints new NFT that represents a position with selected parameters.

### Action ID

`0xba6f48af`

### SDK Action

```ts
const uniswapV3CreatePoolAction = new dfs.actions.uniswapV3.UniswapV3CreatePoolAction(
    token0,
    token1,
    fee,
    tickLower,
    tickUpper,
    amount0Desired,
    amount1Desired,
    amount0Min,
    amount1Min,
    recipient,
    deadline,
    from,
    sqrtPriceX96
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param token0 The contract address of token0 of the pool
    /// @param token1 The contract address of token1 of the pool
    /// @param fee The fee amount of the v3 pool for the specified token pair
    /// @param tickLower The lower end of the tick range for the position
    /// @param tickUpper The higher end of the tick range for the position
    /// @param amount0Desired The desired amount of token0 that should be supplied
    /// @param amount1Desired The desired amount of token1 that should be supplied
    /// @param amount0Min The minimum amount of token0 that should be supplied,
    /// @param amount1Min The minimum amount of token1 that should be supplied,
    /// @param recipient address which will receive the NFT
    /// @param deadline The time by which the transaction must be included to effect the change
    /// @param from account to take amounts from
    /// @param sqrtPriceX96 The initial square root price of the pool as a Q64.96 value
    struct Params {
        address token0;
        address token1;
        uint24 fee;
        int24 tickLower;
        int24 tickUpper;
        uint256 amount0Desired;
        uint256 amount1Desired;
        uint256 amount0Min;
        uint256 amount1Min;
        address recipient;
        uint256 deadline;
        address from;
        uint160 sqrtPriceX96;
    }
```

### Return Value

```solidity
return bytes32(tokenId);
```

### Events and Logs

```solidity
emit ActionEvent("UniCreatePoolV3", logData);
logger.logActionDirectEvent("UniCreatePoolV3", logData);
bytes memory logData = abi.encode(params);
```
