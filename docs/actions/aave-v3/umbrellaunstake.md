---
icon: ghost
---

# UmbrellaUnstake

### Description

UmbrellaUnstake - Unstake aTokens/underlying or GHO tokens using Umbrella Stake Token

> **Notes**
>
> This action will always unwrap waTokens to aTokens/underlying after unstaking. Passing zero as amount will start cooldown period.

### Action ID

`0x5ea3fadd`

### SDK Action

Following actions will map to UmbrellaUnstake contract:

```ts
const finalizeUnstakeAction = new sdk.actions.umbrella.UmbrellaFinalizeUnstakeAction(
    stkToken,
    to.address,
    amount,
    useATokens,
    minSharesOut
);
const startUnstakeAction = new sdk.actions.umbrella.UmbrellaStartUnstakeAction(
    stkToken
);

```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param stkToken The umbrella stake token.
    /// @param to The address to which the aToken/underlying or GHO will be transferred
    /// @param stkAmount The amount of stkToken shares to burn (max.uint to redeem whole balance, 0 to start cooldown period)
    /// @param useATokens Whether to unwrap waTokens to aTokens or underlying (e.g. aUSDC or USDC).
    /// @param minAmountOut The minimum amount of aToken/underlying or GHO to be received
    struct Params {
        address stkToken;
        address to;
        uint256 stkAmount;
        bool useATokens;
        uint256 minAmountOut;
    }
```

### Return Value

```solidity
return bytes32(redeemedAmount);
```

### Events and Logs

```solidity
emit ActionEvent("UmbrellaUnstake", logData);
logger.logActionDirectEvent("UmbrellaUnstake", logData);
bytes memory logData = abi.encode(params);
```
