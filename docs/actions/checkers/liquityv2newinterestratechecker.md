---
icon: check
---

# LiquityV2NewInterestRateChecker

### Description

> **Notes**
>
> Validates that the interest rate of a LiquityV2 trove was correctly adjusted after strategy execution.

### Action ID

`0xc3bbc489`

### SDK Action

```ts
const liquityV2NewInterestRateCheckerAction = new dfs.actions.LiquityV2NewInterestRateCheckerAction(
    market,
    troveId,
    interestRateChange
);

```

### Action Type

`CHECK_ACTION`

### Input Parameters

```solidity
    /// @param oldRate The original interest rate before adjustment
    /// @param newRate The actual interest rate after adjustment
    /// @param market Address of the LiquityV2 market containing the trove
    /// @param troveId ID of the trove to check the interest rate for
    /// @param interestRateChange Expected interest rate change amount (in basis points or wei)
    struct Params {
        address market;
        uint256 troveId;
        uint256 interestRateChange;
    }
```

### Return Value

```solidity
return bytes32(troveData.annualInterestRate)
```

### Events and Logs

```solidity
emit ActionEvent("LiquityV2NewInterestRateChecker", logData);
bytes memory logData = abi.encode(params);
```
