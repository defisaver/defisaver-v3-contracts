---
icon: droplet
---

# LiquityBorrow

### Description

Action for borrowing LUSD tokens from Liquity

> **Notes**
>
> Increases the trove"s debt and withdraws minted LUSD tokens from the trove

### Action ID

`0x1b4a4a55`

### SDK Action

```ts
const liquityBorrowAction = new dfs.actions.liquity.LiquityBorrowAction(
    maxFeePercentage,
    lusdAmount,
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
    /// @param lusdAmount Amount of LUSD tokens to borrow
    /// @param to Address that will receive the tokens
    /// @param upperHint Upper hint for finding a Trove in linked list
    /// @param lowerHint Lower hint for finding a Trove in linked list
    struct Params {
        uint256 maxFeePercentage;
        uint256 lusdAmount;
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
emit ActionEvent("LiquityBorrow", logData);
logger.logActionDirectEvent("LiquityBorrow", logData);
bytes memory logData = abi.encode(params);
```
