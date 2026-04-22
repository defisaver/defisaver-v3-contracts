---
icon: ghost
---

# GhoUnstake

### Description

Action to unstake stkGHO tokens.

### Action ID

`0xe1c6999c`

### SDK Action

Following actions will map to GhoUnstake contract:

```ts
const ghoFinalizeUnstakeAction = new dfs.actions.stkgho.GhoFinalizeUnstakeAction(
    amount,
    to
);
const ghoStartUnstakeAction = new dfs.actions.stkgho.GhoStartUnstakeAction();

```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param amount amount of stkGHO tokens to burn (max.uint to redeem whole balance, 0 to start cooldown period)
    /// @param to address to receive GHO tokens
    struct Params {
        uint256 amount;
        address to;
    }
```

### Return Value

```solidity
return bytes32(claimedAmount);
```

### Events and Logs

```solidity
emit ActionEvent("GhoUnstake", logData);
logger.logActionDirectEvent("GhoUnstake", logData);
bytes memory logData = abi.encode(params);
```
