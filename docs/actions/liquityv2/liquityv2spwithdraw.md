---
icon: droplet
---

# LiquityV2SPWithdraw

### Description

Withdraws a token from the LiquityV2 Stability Pool

### Action ID

`0x1eea7fdb`

### SDK Action

```ts
const liquityV2SPWithdrawAction = new dfs.actions.liquityV2.LiquityV2SPWithdrawAction(
    market,
    boldTo,
    collGainTo,
    amount,
    doClaim
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param market The address of the LiquityV2 market (collateral branch)
    /// @param boldTo The address to send the BOLD tokens to
    /// @param collGainTo The address to send the collateral gains to
    /// @param amount The amount of BOLD tokens to withdraw
    /// @param doClaim If true, the action will claim the collateral gains if existent
    struct Params {
        address market;
        address boldTo;
        address collGainTo;
        uint256 amount;
        bool doClaim;
    }
```

### Return Value

```solidity
return bytes32(withdrawnAmount);
```

### Events and Logs

```solidity
emit ActionEvent("LiquityV2SPWithdraw", logData);
logger.logActionDirectEvent("LiquityV2SPWithdraw", logData);
bytes memory logData = abi.encode(params);
```
