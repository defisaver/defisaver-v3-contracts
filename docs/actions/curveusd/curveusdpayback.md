# ➿ CurveUsdPayback

### Description

Action that pays back crvUSD to a curveusd position

> **Notes**
>
> if paybackAmount >= debt will repay whole debt and close the position, transferring collateral

### Action ID

`0xf0b33d69`

### SDK Action

```ts
const curveUsdPaybackAction = new dfs.actions.curveusd.CurveUsdPaybackAction(
    controllerAddress,
    from,
    onBehalfOf,
    to,
    debtAmount,
    maxActiveBand
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param controllerAddress Address of the curveusd market controller
    /// @param from Address from which to pull crvUSD, will default to user's wallet
    /// @param onBehalfOf Address for which we are paying back debt, will default to user's wallet
    /// @param to Address that will receive the crvUSD and collateral asset if close, will default to user's wallet
    /// @param paybackAmount Amount of crvUSD to payback
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
emit ActionEvent("CurveUsdPayback", logData);
logger.logActionDirectEvent("CurveUsdPayback", logData);
bytes memory logData = abi.encode(params);
```
