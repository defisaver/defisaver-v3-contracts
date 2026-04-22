---
icon: droplet
---

# LiquityV2Open

### Description

Opens a LiquityV2 trove on a specific market

> **Notes**
>
> Opening a trove requires fixed fee of 0.0375 WETH on LiquityV2, regardless of market used.

### Action ID

`0x2dfc4d0b`

### SDK Action

```ts
const liquityV2OpenAction = new dfs.actions.liquityV2.LiquityV2OpenAction(
    market,
    from,
    to,
    collToken,
    interestBatchManager,
    ownerIndex,
    collAmount,
    boldAmount,
    upperHint,
    lowerHint,
    annualInterestRate,
    maxUpfrontFee
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param market The address of the LiquityV2 market (collateral branch)
    /// @param from The address to pull the tokens from
    /// @param to The address to send the bold tokens to
    /// @param interestBatchManager The address of the interest batch manager
    /// @param ownerIndex The index of the owner used to calculate the trove ID
    /// @param collAmount The amount of collateral to deposit
    /// @param boldAmount The amount of BOLD to mint
    /// @param upperHint The upper hint for the trove
    /// @param lowerHint The lower hint for the trove. See LiquityV2View for fetching hints
    /// @param annualInterestRate The annual interest rate for the trove
    /// @param maxUpfrontFee The maximum upfront fee to pay
    struct Params {
        address market;
        address from;
        address to;
        address interestBatchManager;
        uint256 ownerIndex;
        uint256 collAmount;
        uint256 boldAmount;
        uint256 upperHint;
        uint256 lowerHint;
        uint256 annualInterestRate;
        uint256 maxUpfrontFee;
    }
```

### Return Value

```solidity
return bytes32(collAmount);
```

### Events and Logs

```solidity
emit ActionEvent("LiquityV2Open", logData);
logger.logActionDirectEvent("LiquityV2Open", logData);
bytes memory logData = abi.encode(params);
```
