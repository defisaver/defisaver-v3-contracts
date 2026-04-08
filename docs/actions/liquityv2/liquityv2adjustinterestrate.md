---
icon: droplet
---

# LiquityV2AdjustInterestRate

### Description

Adjust the interest rate of a LiquityV2 trove on a specific market

### Action ID

`0xb0fa164d`

### SDK Action

```ts
const liquityV2AdjustInterestRateAction = new dfs.actions.liquityV2.LiquityV2AdjustInterestRateAction(
    market,
    troveId,
    newAnnualInterestRate,
    upperHint,
    lowerHint,
    maxUpfrontFee
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param market The address of the LiquityV2 market (collateral branch)
    /// @param troveId The ID of the trove to adjust the interest rate of
    /// @param newAnnualInterestRate The new annual interest rate for the trove
    /// @param upperHint The upper hint for the trove
    /// @param lowerHint The lower hint for the trove
    /// @param maxUpfrontFee The maximum upfront fee to pay (see IHintHelpers:predictAdjustTroveUpfrontFee)
    struct Params {
        address market;
        uint256 troveId;
        uint256 newAnnualInterestRate;
        uint256 upperHint;
        uint256 lowerHint;
        uint256 maxUpfrontFee;
    }
```

### Return Value

```solidity
return bytes32(newInterestRate);
```

### Events and Logs

```solidity
emit ActionEvent("LiquityV2AdjustInterestRate", logData);
logger.logActionDirectEvent("LiquityV2AdjustInterestRate", logData);
bytes memory logData = abi.encode(params);
```
