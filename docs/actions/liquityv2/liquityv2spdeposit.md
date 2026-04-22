---
icon: droplet
---

# LiquityV2SPDeposit

### Description

Deposits a token to the LiquityV2 Stability Pool

### Action ID

`0x042eb099`

### SDK Action

```ts
const liquityV2SPDepositAction = new dfs.actions.liquityV2.LiquityV2SPDepositAction(
    market,
    from,
    boldGainTo,
    collGainTo,
    amount,
    doClaim
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    
    struct Params {
        address market;
        address from;
        address boldGainTo;
        address collGainTo;
        uint256 amount;
        bool doClaim;
    }
```

### Return Value

```solidity
return bytes32(depositedAmount);
```

### Events and Logs

```solidity
emit ActionEvent("LiquityV2SPDeposit", logData);
logger.logActionDirectEvent("LiquityV2SPDeposit", logData);
bytes memory logData = abi.encode(params);
```
