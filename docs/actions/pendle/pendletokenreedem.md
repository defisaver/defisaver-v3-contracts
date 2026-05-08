---
icon: circle-parking
---

# PendleTokenReedem

### Description

Redeems PT tokens for underlying tokens after maturity. E.g PT-eUSDE-{date} -> eUSDE

> **Notes**
>
> This action performs two steps:
>
> ```solidity
> /// 1. First convert PT token to SY token
> /// 2. Then convert SY token to underlying tokens
> ```

### Action ID

`0x3de77432`

### SDK Action

```ts
const pendleTokenRedeemAction = new dfs.actions.pendle.PendleTokenRedeemAction(
    market,
    underlyingToken,
    ptToken,
    from,
    to,
    ptAmount,
    minAmountOut
);

```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param market The address of the Pendle market
    /// @param underlyingToken The address of the underlying token
    /// @param from The address from where the PT tokens will be pulled
    /// @param to The address of the recipient to receive the underlying tokens
    /// @param ptAmount The amount of PT tokens to redeem
    /// @param minAmountOut The minimum amount of underlying tokens to receive
    struct Params {
        address market;
        address underlyingToken;
        address from;
        address to;
        uint256 ptAmount;
        uint256 minAmountOut;
    }
```

### Return Value

```solidity
return bytes32(underlyingAmount);
```

### Events and Logs

```solidity
emit ActionEvent("PendleTokenRedeem", logData);
logger.logActionDirectEvent("PendleTokenRedeem", logData);
bytes memory logData = abi.encode(params);
```
