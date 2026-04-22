---
icon: ghost
---

# AaveV4Payback

## Description

Payback a token a user borrowed from an AaveV4 market.


## Action ID
`0xe5585d1e`

## SDK Action
````ts
const aaveV4PaybackAction = new dfs.actions.aavev4.AaveV4PaybackAction(
    spoke,
    onBehalf,
    from,
    reserveId,
    amount,
    tokenAddress
);
````

## Action Type
`STANDARD_ACTION`

## Input Parameters
```solidity
    /// @param spoke Address of the spoke.
    /// @param onBehalf Address to payback tokens on behalf of. Defaults to the user's wallet if not provided.
    /// @param from Address from which to pull the payback tokens.
    /// @param reserveId Reserve id.
    /// @param amount Amount of tokens to payback. Send type(uint).max to payback whole amount.
    struct Params {
        address spoke;
        address onBehalf;
        address from;
        uint256 reserveId;
        uint256 amount;
    }
```

## Return Value
```solidity
return bytes32(amount);
```

## Events and Logs
```solidity
emit ActionEvent("AaveV4Payback", logData);
logger.logActionDirectEvent("AaveV4Payback", logData);
bytes memory logData = abi.encode(params);
```
