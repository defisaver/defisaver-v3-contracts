# ➿ CrvUsdSelfLiqWithCollTransient

### Description

Liquidates a curveusd position with a given percentage of collateral

> **Notes**
>
> This action uses internal swapper with transient storage to liquidate the position

### Action ID

`0x49b9a61e`

### SDK Action

```ts
const curveUsdSelfLiquidateWithCollTransientAction = new dfs.actions.curveusd.CurveUsdSelfLiquidateWithCollTransientAction(
    controllerAddress,
    percentage,
    minCrvUsdExpected,
    to,
    exchangeOrder,
    sellAllCollateral,
    gasUsed
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param controllerAddress Address of the curveusd market controller
    /// @param percentage Fraction to liquidate; 100% = 10**18
    /// @param minCrvUsdExpected Users crvUsd collateral balance must be bigger than this
    /// @param to Where to send the leftover funds if full close
    /// @param exData exchange data for swapping (srcAmount will be amount of coll token sold)
    /// @param sellAllCollateral Since coll token amount is changeable during soft liquidation, this will replace srcAmount in exData with coll amount
    /// @param gasUsed Only used as part of a strategy, estimated gas used for this tx
    struct Params {
        address controllerAddress;
        uint256 percentage;
        uint256 minCrvUsdExpected;
        address to;
        DFSExchangeData.ExchangeData exData;
        bool sellAllCollateral;
        uint32 gasUsed;
    }
```

### Return Value

```solidity
return bytes32(debtTokenReceived);
```

### Events and Logs

```solidity
emit ActionEvent("CurveUsdSelfLiquidateWithCollTransient", logData);
logger.logActionDirectEvent("CurveUsdSelfLiquidateWithCollTransient", logData);
bytes memory logData = abi.encode(params);
```
