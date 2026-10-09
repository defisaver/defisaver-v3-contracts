---
icon: bolt-lightning
---

# FLAaveV3CarryDebt

### Description

FLAaveV3CarryDebt

> **Notes**
>
> Aave V3 flashloan action that generates debt for the borrowed amount instead of repaying it in the same transaction. This action doesn't have any flashloan fees. This action is only meant to be used for smart wallet positions.

### Action ID

`0x66258f8a`

### SDK Action

```ts
const fLAaveV3CarryDebtAction = new dfs.actions.flashloan.AaveV3FlashLoanCarryDebtAction(
    tokens,
    loanAmounts,
    flParamGetterAddr,
    flParamGetterData
);

```

> SDK pre-populates the `modes` and `onBehalfOf` input params:
>
> * `modes` → array of `[2, 2, ..., 2]` matching tokens length, representing variable-rate mode on Aave V3
> * `onBehalfOf` → always set to the user's smart wallet address

### Action Type

`FL_ACTION`

### Input Parameters

Inputs are not parsed as the FL action is always the first action and there are no return values before this action

```solidity
// @param tokens Array of tokens being flash loaned
// @param amounts Array of amounts being flash loaned
// @param modes AaveV3 variable rate modes
// @param onBehalfOf Will always be smart wallet address
// @param flParamGetterAddr Address of an on chain contract that can change (amount, token) while calling the action. If it's an empty address it will not be called. Not used in this implementation.
// @param flParamGetterData Used to choose between FL providers
// @param recipeData Recipe data for post fl execution inside recipe
struct FlashLoanParams {
    address[] tokens;
    uint256[] amounts;
    uint256[] modes;
    address onBehalfOf;
    address flParamGetterAddr;
    bytes flParamGetterData;
    bytes recipeData;
}
```

### Return Value

```solidity
return bytes32(amount);
```

### Events and Logs

```solidity
emit ActionEvent(
    "FLAaveV3CarryDebt", abi.encode(params.tokens, params.amounts, params.modes, wallet)
);

```
