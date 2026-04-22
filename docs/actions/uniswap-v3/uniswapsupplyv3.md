---
icon: pegasus
---

# UniSupplyV3

### Description

Supplies liquidity to a UniswapV3 position represented by TokenId

> **Notes**
>
> The address from which we're pulling token0 and token1 must approve proxy.
>
> If amount0Desired or amount1Desired is uint.max this will pull whole balance of \_from.
>
> Increases liquidity by token amounts desired.

### Action ID

`0xe8ce1e88`

### SDK Action

```ts
const uniswapV3SupplyAction = new dfs.actions.uniswapV3.UniswapV3SupplyAction(
    tokenId,
    amount0Desired,
    amount1Desired,
    amount0Min,
    amount1Min,
    deadline,
    from,
    token0,
    token1
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param tokenId - The ID of the token for which liquidity is being increased
    /// @param liquidity -The amount by which liquidity will be increased,
    /// @param amount0Desired - The desired amount of token0 that should be supplied,
    /// @param amount1Desired - The desired amount of token1 that should be supplied,
    /// @param amount0Min - The minimum amount of token0 that should be supplied,
    /// @param amount1Min - The minimum amount of token1 that should be supplied,
    /// @param deadline - The time by which the transaction must be included to effect the change
    /// @param from - account to take amounts from
    /// @param token0 - address of the first token
    /// @param token1 - address of the second token
    struct Params {
        uint256 tokenId;
        uint256 amount0Desired;
        uint256 amount1Desired;
        uint256 amount0Min;
        uint256 amount1Min;
        uint256 deadline;
        address from;
        address token0;
        address token1;
    }
```

### Return Value

```solidity
return bytes32(uint256(liquidity));
```

### Events and Logs

```solidity
emit ActionEvent("UniSupplyV3", logData);
logger.logActionDirectEvent("UniSupplyV3", logData);
bytes memory logData = abi.encode(params);
```
