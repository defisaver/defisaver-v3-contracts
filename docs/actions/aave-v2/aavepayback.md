---
icon: ghost
---

# AavePayback

### Description

Payback a token a user borrowed from an Aave market

> **Notes**
>
> User paybacks tokens to the Aave protocol

### Action ID

`0x9ca7f8d2`

### SDK Action

```ts
const aavePaybackAction = new dfs.actions.aave.AavePaybackAction(
    market,
    tokenAddr,
    amount,
    rateMode,
    from,
    onBehalf
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param market Aave Market address.
    /// @param tokenAddr Token address.
    /// @param amount Amount of tokens to pay back.
    /// @param rateMode Rate mode.
    /// @param from Address to send the payback tokens from.
    /// @param onBehalf Address to send the payback tokens on behalf of. Defaults to the user's wallet.
    struct Params {
        address market;
        address tokenAddr;
        uint256 amount;
        uint256 rateMode;
        address from;
        address onBehalf;
    }
```

### Return Value

```solidity
return bytes32(paybackAmount);
```

### Events and Logs

```solidity
emit ActionEvent("AavePayback", logData);
logger.logActionDirectEvent("AavePayback", logData);
bytes memory logData = abi.encode(params);
```
