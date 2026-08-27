---
icon: bluesky
---

# MidnightWithdrawCollateral

### Description

Withdraw collateral from the Midnight market.

### Action ID

`0xa1f04e15`

### SDK Action

```ts
const midnightWithdrawCollateralAction = new dfs.actions.midnight.MidnightWithdrawCollateralAction(
    marketId,
    onBehalf,
    to,
    amount,
    collateralIndex
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param marketId Market id.
    /// @param onBehalf Address to withdraw tokens on behalf of. Defaults to the user's wallet if not provided.
    /// @param to Address that will receive the withdrawn tokens.
    /// @param amount Amount of tokens to withdraw. Send type(uint).max to withdraw whole amount.
    /// @param collateralIndex Collateral index (0-based).
    struct Params {
        bytes32 marketId;
        address onBehalf;
        address to;
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
emit ActionEvent("MidnightWithdrawCollateral", logData);
logger.logActionDirectEvent("MidnightWithdrawCollateral", logData);
bytes memory logData = abi.encode(params);
```
