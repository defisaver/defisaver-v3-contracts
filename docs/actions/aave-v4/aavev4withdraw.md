---
icon: ghost
---

# AaveV4Withdraw

### Description

Withdraw a token from an Aave spoke.

> **Notes**
>
> Send type(uint).max to withdraw whole amount.


### Action ID
`0x13a9a106`

### SDK Action
````ts
const aaveV4WithdrawAction = new dfs.actions.aavev4.AaveV4WithdrawAction(
    spoke,
    onBehalf,
    to,
    reserveId,
    amount
);
````

### Action Type
`STANDARD_ACTION`

### Input Parameters
```solidity
    /// @param spoke Address of the spoke.
    /// @param onBehalf Address to withdraw tokens on behalf of. Defaults to the user's wallet if not provided.
    /// @param to Address that will receive the withdrawn tokens.
    /// @param reserveId Reserve id.
    /// @param amount Amount of tokens to withdraw. Send type(uint).max to withdraw whole amount.
    struct Params {
        address spoke;
        address onBehalf;
        address to;
        uint256 reserveId;
        uint256 amount;
    }
```

### Return Value
```solidity
return bytes32(amount);
```

### Events and Logs
```solidity
emit ActionEvent("AaveV4Withdraw", logData);
logger.logActionDirectEvent("AaveV4Withdraw", logData);
bytes memory logData = abi.encode(params);
```
