---
icon: droplet
---

# LiquityV2Borrow

### Description

Borrows a bold amount from a LiquityV2 trove on a specific market

### Action ID

`0x78b6a3ae`

### SDK Action

```ts
const liquityV2BorrowAction = new dfs.actions.liquityV2.LiquityV2BorrowAction(
    market,
    to,
    troveId,
    amount,
    maxUpfrontFee
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param market The address of the LiquityV2 market (collateral branch)
    /// @param to The address to send the tokens to
    /// @param troveId The ID of the trove to borrow the tokens from
    /// @param amount The amount of tokens to borrow
    /// @param maxUpfrontFee The maximum upfront fee to pay (see IHintHelpers:predictAdjustTroveUpfrontFee)
    struct Params {
        address market;
        address to;
        uint256 troveId;
        uint256 amount;
        uint256 maxUpfrontFee;
    }
```

### Return Value

```solidity
return bytes32(amount);
```

### Events and Logs

```solidity
emit ActionEvent("LiquityV2Borrow", logData);
logger.logActionDirectEvent("LiquityV2Borrow", logData);
bytes memory logData = abi.encode(params);
```
