---
icon: ghost
---

# GhoStake

### Description

Action to stake GHO tokens.

### Action ID

`0x1904bda0`

### SDK Action

```ts
const ghoStakeAction = new dfs.actions.GhoStakeAction(
    from,
    to,
    amount
);

```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param from address to pull the GHO tokens from
    /// @param to address to send the stkGHO tokens to
    /// @param amount amount of GHO tokens to stake
    struct Params {
        address from;
        address to;
        uint256 amount;
    }
```

### Return Value

```solidity
return bytes32(stkTokensReceived);
```

### Events and Logs

```solidity
emit ActionEvent("GhoStake", logData);
logger.logActionDirectEvent("GhoStake", logData);
bytes memory logData = abi.encode(params);
```
