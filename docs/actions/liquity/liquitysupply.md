---
icon: droplet
---

# LiquitySupply

### Description

Action for supplying collateral to Liquity Trove

> **Notes**
>
> Supplies collateral to the users trove

### Action ID

`0x7fe3a181`

### SDK Action

```ts
const liquitySupplyAction = new dfs.actions.liquity.LiquitySupplyAction(
    collAmount,
    from,
    upperHint,
    lowerHint
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param collAmount Amount of WETH tokens to supply
    /// @param from Address where to pull the tokens from
    /// @param upperHint Upper hint for finding a Trove in linked list
    /// @param lowerHint Lower hint for finding a Trove in linked list
    struct Params {
        uint256 collAmount;
        address from;
        address upperHint;
        address lowerHint;
    }
```

### Return Value

```solidity
return bytes32(suppliedAmount);
```

### Events and Logs

```solidity
emit ActionEvent("LiquitySupply", logData);
logger.logActionDirectEvent("LiquitySupply", logData);
bytes memory logData = abi.encode(params);
```
