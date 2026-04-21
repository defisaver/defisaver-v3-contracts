---
icon: ghost
---

# UmbrellaStake

### Description

UmbrellaStake - Stake aTokens/underlying or GHO tokens using Umbrella Stake Token

> **Notes**
>
> This action will always pull aTokens or underlying for non GHO staking and wrap them into waTokens for staking. Wraps aTokens into waTokens. Wraps underlying asset into waTokens.

### Action ID

`0x1c4fe1da`

### SDK Action

```ts
const umbrellaStakeAction = new dfs.actions.umbrella.UmbrellaStakeAction(
    stkToken,
    from.address,
    to.address,
    amount,
    useATokens,
    minSharesOut
);

```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param stkToken The umbrella stake token.
    /// @param from The address from which the aToken or GHO will be pulled.
    /// @param to The address to which the stkToken will be transferred
    /// @param amount The amount of aToken/underlying or GHO to be staked.
    /// @param useATokens Whether to use aTokens or underlying for staking (e.g. aUSDC or USDC).
    /// @param minSharesOut The minimum amount of stkToken shares to receive.
    struct Params {
        address stkToken;
        address from;
        address to;
        uint256 amount;
        bool useATokens;
        uint256 minSharesOut;
    }
```

### Return Value

```solidity
return bytes32(stkTokenShares);
```

### Events and Logs

```solidity
emit ActionEvent("UmbrellaStake", logData);
logger.logActionDirectEvent("UmbrellaStake", logData);
bytes memory logData = abi.encode(params);
```
