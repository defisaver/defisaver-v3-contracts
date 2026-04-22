---
icon: ghost
---

# AaveUnstake

### Description

Action to unstake stkAave tokens

### Action ID

`0x887729ae`

### SDK Action

Following actions will map to AaveUnstake contract:

```ts
const aaveFinalizeUnstakeAction = new dfs.actions.aave.AaveFinalizeUnstakeAction(
    amount,
    to
);
const aaveStartUnstakeAction = new dfs.actions.aave.AaveStartUnstakeAction();

```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param amount amount of stkAave tokens to burn (max.uint to redeem whole balance)
    /// @param to address to receive AAVE tokens
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
emit ActionEvent("AaveUnstake", logData);
logger.logActionDirectEvent("AaveUnstake", logData);
bytes memory logData = abi.encode(params);
```
