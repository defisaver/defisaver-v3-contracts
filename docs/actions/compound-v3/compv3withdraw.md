---
icon: building-columns
---

# CompV3Withdraw

### Description

Withdraw a token from CompoundV3.

> **Notes**
>
> Sending type(uint).max withdraws the whole balance of \_from addr

### Action ID

`0xc0072381`

### SDK Action

```ts
const compoundV3WithdrawAction = new dfs.actions.compoundV3.CompoundV3WithdrawAction(
    market,
    to,
    asset,
    amount,
    onBehalf
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param market Main Comet proxy contract that is different for each compound market
    /// @param to Address where we are sending the withdrawn tokens
    /// @param asset Address of the token to withdraw
    /// @param amount The quantity to withdraw
    /// @param onBehalf Address from which we are withdrawing the tokens from
    struct Params {
        address market;
        address to;
        address asset;
        uint256 amount;
        address onBehalf;
    }
```

### Return Value

```solidity
return bytes32(withdrawAmount);
```

### Events and Logs

```solidity
emit ActionEvent("CompV3Withdraw", logData);
logger.logActionDirectEvent("CompV3Withdraw", logData);
bytes memory logData = abi.encode(params);
```
