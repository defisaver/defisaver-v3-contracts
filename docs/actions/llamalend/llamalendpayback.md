---
icon: rainbow
---

# LlamaLendPayback

### Description

Action that pays back debt asset to a llamalend position

### Action ID

`0x48ef1f07`

### SDK Action

```ts
const llamaLendPaybackAction = new dfs.actions.llamalend.LlamaLendPaybackAction(
    controllerAddress,
    from,
    onBehalfOf,
    to,
    debtAmount,
    maxActiveBand,
    debtAsset
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param controllerAddress Address of the llamalend market controller
    /// @param from Address from which to pull debt asset, will default to user's wallet
    /// @param onBehalfOf Address for which we are paying back debt, will default to user's wallet
    /// @param to Address that will receive the debt asset and collateral asset if close, will default to user's wallet
    /// @param paybackAmount Amount of debt asset to payback
    /// @param maxActiveBand Don't allow active band to be higher than this (to prevent front-running the repay)
    struct Params {
        address controllerAddress;
        address from;
        address onBehalfOf;
        address to;
        uint256 paybackAmount;
        int256 maxActiveBand;
    }
```

### Return Value

```solidity
return bytes32(paybackAmount);
```

### Events and Logs

```solidity
emit ActionEvent("LlamaLendPayback", logData);
logger.logActionDirectEvent("LlamaLendPayback", logData);
bytes memory logData = abi.encode(params);
```
