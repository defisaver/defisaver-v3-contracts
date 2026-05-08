---
description: Supply a token to an AaveV2 market.
icon: ghost
---

# AaveSupply

## AaveSupply

### Description

Supply a token to an Aave market

> **Notes**
>
> User deposits tokens to the Aave protocol. User needs to approve its wallet to pull the \_tokenAddr tokens.

### Action ID

`0xc380343c`

### SDK Action

```ts
const aaveSupplyAction = new dfs.actions.aave.AaveSupplyAction(
    market,
    tokenAddr,
    amount,
    from,
    onBehalf,
    enableAsColl
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param market Aave Market address.
    /// @param tokenAddr Token address.
    /// @param amount Amount of tokens to supply.
    /// @param from Address to send the supply tokens from.
    /// @param onBehalf Address to send the supply tokens on behalf of. Defaults to the user's wallet.
    /// @param enableAsColl Whether to enable the token as collateral.
    struct Params {
        address market;
        address tokenAddr;
        uint256 amount;
        address from;
        address onBehalf;
        bool enableAsColl;
    }
```

### Return Value

```solidity
return bytes32(supplyAmount);
```

### Events and Logs

```solidity
emit ActionEvent("AaveSupply", logData);
logger.logActionDirectEvent("AaveSupply", logData);
bytes memory logData = abi.encode(params);
```
