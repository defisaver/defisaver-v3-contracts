---
icon: droplet
---

# LiquityAdjust

### Description

Adjusts a Trove by depositing or withdrawing collateral and borrowing or repaying debt.

### Action ID

`0xe4562a9c`

### SDK Action

```ts
const liquityAdjustAction = new dfs.actions.liquity.LiquityAdjustAction(
    maxFeePercentage,
    collAmount,
    lusdAmount,
    collChange,
    debtChange,
    from,
    to,
    upperHint,
    lowerHint
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param maxFeePercentage Highest borrowing fee to accept, ranges between 0.5 and 5%
    /// @param collAmount Amount of ETH to supply/withdraw
    /// @param lusdAmount Amount of LUSD tokens to borrow/payback
    /// @param collChange Whether to supply or withdraw collateral
    /// @param debtChange Whether to borrow or payback debt
    /// @param from Address where to pull the tokens from
    /// @param to Address that will receive the tokens
    /// @param upperHint Upper hint for finding a Trove in linked list
    /// @param lowerHint Lower hint for finding a Trove in linked list
    struct Params {
        uint256 maxFeePercentage;
        uint256 collAmount;
        uint256 lusdAmount;
        CollChange collChange;
        DebtChange debtChange;
        address from;
        address to;
        address upperHint;
        address lowerHint;
    }
```

### Return Value

```solidity
return bytes32(borrowedAmount);
```

### Events and Logs

```solidity
emit ActionEvent("LiquityAdjust", logData);
logger.logActionDirectEvent("LiquityAdjust", logData);
bytes memory logData = abi.encode(params);
```
