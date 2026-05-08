---
icon: droplet
---

# LiquityV2Withdraw

### Description

Withdraws a token from a LiquityV2 trove on a specific market

### Action ID

`0x3f2f7b9d`

### SDK Action

```ts
const liquityV2WithdrawAction = new dfs.actions.liquityV2.LiquityV2WithdrawAction(
    market,
    to,
    troveId,
    amount
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param market The address of the LiquityV2 market (collateral branch)
    /// @param to The address to send the tokens to
    /// @param troveId The ID of the trove to withdraw the tokens from
    /// @param amount The amount of tokens to withdraw
    struct Params {
        address market;
        address to;
        uint256 troveId;
        uint256 amount;
    }
```

### Return Value

```solidity
return bytes32(amount);
```

### Events and Logs

```solidity
emit ActionEvent("LiquityV2Withdraw", logData);
logger.logActionDirectEvent("LiquityV2Withdraw", logData);
bytes memory logData = abi.encode(params);
```
