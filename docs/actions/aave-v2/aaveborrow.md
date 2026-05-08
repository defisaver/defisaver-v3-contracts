---
icon: ghost
---

# AaveBorrow

### Description

Borrow a token from an Aave market

> **Notes**
>
> User borrows tokens from the Aave protocol

### Action ID

`0x5faaad42`

### SDK Action

```ts
const aaveBorrowAction = new dfs.actions.aave.AaveBorrowAction(
    market,
    tokenAddr,
    amount,
    rateMode,
    to,
    onBehalf
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param market Aave Market address.
    /// @param tokenAddr Token address.
    /// @param amount Amount of tokens to borrow.
    /// @param rateMode Rate mode.
    /// @param to Address to send the borrowed tokens to.
    /// @param onBehalf Address to send the borrowed tokens on behalf of. Defaults to the user's wallet.
    struct Params {
        address market;
        address tokenAddr;
        uint256 amount;
        uint256 rateMode;
        address to;
        address onBehalf;
    }
```

### Return Value

```solidity
return bytes32(borrowAmount);
```

### Events and Logs

```solidity
emit ActionEvent("AaveBorrow", logData);
logger.logActionDirectEvent("AaveBorrow", logData);
bytes memory logData = abi.encode(params);
```

