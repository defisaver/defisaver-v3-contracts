---
icon: pegasus
---

# UniMintV3

### Description

Mints NFT that represents a position in uni v3

> **Notes**
>
> The address from which we're pulling token0 and token1 must approve proxy.
>
> If amount0Desired or amount1Desired is uint.max this will pull whole balance of \_from.

### Action ID

`0xe5eb7e36`

### SDK Action

```ts
const uniswapV3MintAction = new dfs.actions.uniswapV3.UniswapV3MintAction(
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
    from
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param token0 Address of the first token
    /// @param token1 Address of the second token
    /// @param fee Fee of the pool
    /// @param tickLower Lower tick of the position
    /// @param tickUpper Upper tick of the position
    /// @param amount0Desired Amount of the first token to add
    /// @param amount1Desired Amount of the second token to add
    /// @param amount0Min Minimum amount of the first token to add
    /// @param amount1Min Minimum amount of the second token to add
    /// @param recipient Address to send the NFT to
    /// @param deadline Deadline of the transaction
    /// @param from Address to pull the tokens from
    struct Params {
        address token0;
        uint256 amount0Desired;
        uint256 amount1Desired;
        uint256 amount0Min;
        uint256 amount1Min;
        address recipient;
        uint256 deadline;
        address from;
    }
```

### Return Value

```solidity
return bytes32(tokenId);
```

### Events and Logs

```solidity
emit ActionEvent("UniMintV3", logData);
logger.logActionDirectEvent("UniMintV3", logData);
bytes memory logData = abi.encode(params);
```
