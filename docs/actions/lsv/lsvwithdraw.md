---
icon: ethereum
---

# LSVWithdraw

### Description

action for tracking users withdrawals within the LSV ecosystem

> **Notes**
>
> LSV Withdraw expects users to have withdrawn tokens to the user's wallet, from which we'll pull the performance fee. ProfitTracker will return realisedProfit amount, from which we will calculate fee

### Action ID

`0xbc21da53`

### SDK Action

```ts
const lSVWithdrawAction = new dfs.actions.lsv.LSVWithdrawAction(
    protocol,
    token,
    amount,
    isPositionClosing
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param protocol - an ID representing the protocol in LSVProfitTracker
    /// @param token - token which is being withdrawn
    /// @param amount - amount of tokens being withdrawn
    /// @param isPositionClosing - bool representing if the user is fully closing his position
    struct Params {
        uint256 protocol;
        address token;
        uint256 amount;
        bool isPositionClosing;
    }
```

### Return Value

```solidity
return bytes32(remainingAmount);
```

### Events and Logs

```solidity
emit ActionEvent("LSVWithdraw", logData);
logger.logActionDirectEvent("LSVWithdraw", logData);
bytes memory logData = abi.encode(params);
```
