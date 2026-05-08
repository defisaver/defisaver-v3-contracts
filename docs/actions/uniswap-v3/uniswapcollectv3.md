---
icon: pegasus
---

# UniCollectV3

### Description

Collects tokensOwed from a position represented by tokenId

> **Notes**
>
> Collects from tokensOwed on position, sends to recipient, up to amountMax

### Action ID

`0x56a75b05`

### SDK Action

```ts
const uniCollectV3Action = new dfs.actions.uniswapV3.UniswapV3CollectAction(
    tokenId,
    recipient,
    amount0Max,
    amount1Max,
    recipient
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
/// @param tokenId The id of the erc721 token representing the position
/// @param recipient The address to which to send collected amount0 and amount1
/// @param amount0Max Maximum amount of token0 to collect from fees accrued
/// @param amount1Max Maximum amount of token1 to collect from fees accrued
struct Params {
    uint256 tokenId;
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
emit ActionEvent("UniCollectV3", logData);
logger.logActionDirectEvent("UniCollectV3", logData);
bytes memory logData = abi.encode(params);
```
