---
icon: droplet
---

# LiquityV2AdjustZombieTrove

### Description

Adjusts a zombie trove on a specific market

### Action ID

`0x7ae5cb1e`

### SDK Action

```ts
const liquityV2AdjustZombieTroveAction = new dfs.actions.liquityV2.LiquityV2AdjustZombieTroveAction(
    market,
    from,
    to,
    troveId,
    collAmount,
    debtAmount,
    upperHint,
    lowerHint,
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
    /// @param upperHint The upper hint for the trove
    /// @param lowerHint The lower hint for the trove
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
        uint256 upperHint;
        uint256 lowerHint;
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
emit ActionEvent("LiquityV2AdjustZombieTrove", logData);
logger.logActionDirectEvent("LiquityV2AdjustZombieTrove", logData);
bytes memory logData = abi.encode(params);
```
