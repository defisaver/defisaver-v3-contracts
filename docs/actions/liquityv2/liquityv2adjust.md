---
icon: droplet
---

# LiquityV2Adjust

### Description

Adjusts a LiquityV2 trove on a specific market

### Action ID

`0x18151d04`

### SDK Action

```ts
const liquityV2AdjustAction = new dfs.actions.liquityV2.LiquityV2AdjustAction(
    market,
    from,
    to,
    troveId,
    collAmount,
    debtAmount,
    maxUpfrontFee,
    collAction,
    debtAction
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param market The address of the LiquityV2 market (collateral branch)
    /// @param from The address to pull the tokens from
    /// @param to The address to send the tokens to
    /// @param troveId The ID of the trove to adjust
    /// @param collAmount The amount of collateral to supply or withdraw
    /// @param debtAmount The amount of debt to payback or borrow
    /// @param maxUpfrontFee The maximum upfront fee to pay (see IHintHelpers:predictAdjustTroveUpfrontFee)
    /// @param collAction The type of collateral action to perform. 0 for supply, 1 for withdraw
    /// @param debtAction The type of debt action to perform. 0 for payback, 1 for borrow
    struct Params {
        address market;
        address from;
        address to;
        uint256 troveId;
        uint256 collAmount;
        uint256 debtAmount;
        uint256 maxUpfrontFee;
        CollActionType collAction;
        DebtActionType debtAction;
    }
```

### Return Value

```solidity
return bytes32(debtAmount);
```

### Events and Logs

```solidity
emit ActionEvent("LiquityV2Adjust", logData);
logger.logActionDirectEvent("LiquityV2Adjust", logData);
bytes memory logData = abi.encode(params);
```
