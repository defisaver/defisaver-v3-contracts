---
icon: droplet
---

# LiquityWithdraw

### Description

Action for withdrawing collateral from Liquity Trove

> **Notes**
>
> Withdraws collateral from the trove

### Action ID

`0xeb0c03cd`

### SDK Action

```ts
const liquityWithdrawAction = new dfs.actions.liquity.LiquityWithdrawAction(
    collAmount,
    to,
    upperHint,
    lowerHint
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param collAmount Amount of WETH tokens to withdraw
    /// @param to Address that will receive the tokens
    /// @param upperHint Upper hint for finding a Trove in linked list
    /// @param lowerHint Lower hint for finding a Trove in linked list
    struct Params {
        uint256 collAmount;
        address to;
        address upperHint;
        address lowerHint;
    }
```

### Return Value

```solidity
return bytes32(withdrawnAmount);
```

### Events and Logs

```solidity
emit ActionEvent("LiquityWithdraw", logData);
logger.logActionDirectEvent("LiquityWithdraw", logData);
bytes memory logData = abi.encode(params);
```
