---
icon: droplet
---

# LiquityPayback

### Description

Action for repaying LUSD tokens to Liquity Trove

> **Notes**
>
> Repays LUSD tokens to the trove Trove after payback can't have debt less than MIN\_DEBT (2000e18)

### Action ID

`0x0761723e`

### SDK Action

```ts
const liquityPaybackAction = new dfs.actions.liquity.LiquityPaybackAction(
    lusdAmount,
    from,
    upperHint,
    lowerHint
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param lusdAmount Amount of LUSD tokens to repay
    /// @param from Address where to pull the tokens from
    /// @param upperHint Upper hint for finding a Trove in linked list
    /// @param lowerHint Lower hint for finding a Trove in linked list
    struct Params {
        uint256 lusdAmount;
        address from;
        address upperHint;
        address lowerHint;
    }
```

### Return Value

```solidity
return bytes32(repayAmount);
```

### Events and Logs

```solidity
emit ActionEvent("LiquityPayback", logData);
logger.logActionDirectEvent("LiquityPayback", logData);
bytes memory logData = abi.encode(params);
```
