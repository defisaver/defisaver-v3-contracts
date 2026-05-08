# ➿ CurveUsdSelfLiquidateWithColl

### Description

Liquidates a curveusd position with a given percentage of collateral

> **Notes**
>
> This action uses internal swapper to liquidate the position

### Action ID

`0xe17ef895`

### SDK Action

```ts
const curveUsdSelfLiquidateWithCollAction = new dfs.actions.curveusd.CurveUsdSelfLiquidateWithCollAction(
    controllerAddress,
    percentage,
    minCrvUsdExpected,
    swapAmount,
    minAmount,
    to,
    additionData,
    gasUsed,
    dfsFeeDivider
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param controllerAddress Address of the curveusd market controller
    /// @param percentage Fraction to liquidate; 100% = 10**18
    /// @param minCrvUsdExpected Users crvUsd collateral balance must be bigger than this
    /// @param swapAmount Amount of collateral to swap for crvUsd
    /// @param minAmount Minimum amount of crvUSD to receive after sell
    /// @param to Where to send the leftover funds if full close
    /// @param additionalData Additional data where curve swap path is encoded
    /// @param gasUsed Only used as part of a strategy, estimated gas used for this tx
    /// @param dfsFeeDivider Fee divider, if a non standard fee is set it will check for custom fee
    struct Params {
        address controllerAddress;
        uint256 minCrvUsdExpected;
        uint256 swapAmount;
        uint256 minAmount;
        address to;
        bytes additionalData;
        uint32 gasUsed;
        uint24 dfsFeeDivider;
    }
```

### Return Value

```solidity
return bytes32(generatedAmount);
```

### Events and Logs

```solidity
emit ActionEvent("CurveUsdSelfLiquidateWithColl", logData);
logger.logActionDirectEvent("CurveUsdSelfLiquidateWithColl", logData);
bytes memory logData = abi.encode(params);
```
