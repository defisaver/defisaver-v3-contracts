---
icon: droplet
---

# LiquityOpen

### Description

Action for opening a liquity trove

### Action ID

`0x9784ddef`

### SDK Action

```ts
const liquityOpenAction = new dfs.actions.liquity.LiquityOpenAction(
    maxFeePercentage,
    collAmount,
    lusdAmount,
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
    /// @param collAmount Amount of WETH tokens to supply as collateral
    /// @param lusdAmount Amount of LUSD tokens to borrow from the trove, protocol minimum net debt is 1800
    /// @param from Address where to pull the collateral from
    /// @param to Address that will receive the borrowed tokens
    /// @param upperHint Upper hint for finding a Trove in linked list
    /// @param lowerHint Lower hint for finding a Trove in linked list
    struct Params {
        uint256 maxFeePercentage;
        uint256 collAmount;
        uint256 lusdAmount;
        address from;
        address to;
        address upperHint;
        address lowerHint;
    }
```

### Return Value

```solidity
return bytes32(collSupplied);
```

### Events and Logs

```solidity
emit ActionEvent("LiquityOpen", logData);
logger.logActionDirectEvent("LiquityOpen", logData);
bytes memory logData = abi.encode(params);
```
