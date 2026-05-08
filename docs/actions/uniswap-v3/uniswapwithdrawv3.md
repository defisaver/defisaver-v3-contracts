---
icon: pegasus
---

# UniWithdrawV3

### Description

Decreases liquidity from a position represented by tokenID, and collects tokensOwed from position to recipient

> **Notes**
>
> Burns liquidity stated, amount0Min and amount1Min are the least you get for burning that liquidity (else reverted).
>
> Collects from tokensOwed on position, sends to recipient, up to amountMax.

### Action ID

`0x5fc98a7b`

### SDK Action

```ts
const uniswapV3WithdrawAction = new dfs.actions.uniswapV3.UniswapV3WithdrawAction(
    tokenId,
    liquidity,
    amount0Min,
    amount1Min,
    deadline,
    recipient,
    amount0Max,
    amount1Max,
    from
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param tokenId - The ID of the token for which liquidity is being decreased
    /// @param liquidity -The amount by which liquidity will be decreased,
    /// @param amount0Min - The minimum amount of token0 that should be accounted for the burned liquidity,
    /// @param amount1Min - The minimum amount of token1 that should be accounted for the burned liquidity,
    /// @param deadline - The time by which the transaction must be included to effect the change
    /// @param recipient - accounts to receive the tokens
    /// @param amount0Max - The maximum amount of token0 to collect
    /// @param amount1Max - The maximum amount of token1 to collect
    struct Params {
        uint256 tokenId;
        uint128 liquidity;
        uint256 amount0Min;
        uint256 amount1Min;
        uint256 deadline;
        address recipient;
        uint128 amount0Max;
        uint128 amount1Max;
    }
```

### Return Value

```solidity
return bytes32(amount0);
```

### Events and Logs

```solidity
emit ActionEvent("UniWithdrawV3", logData);
logger.logActionDirectEvent("UniWithdrawV3", logData);
bytes memory logData = abi.encode(params);
```
