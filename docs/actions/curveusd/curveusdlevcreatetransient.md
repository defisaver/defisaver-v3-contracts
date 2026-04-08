# ➿ CurveUsdLevCreateTransient

### Description

Creates a new curveusd leveraged position with a given amount of collateral and debt

> **Notes**
>
> This action uses internal swapper with transient storage to create a loan

### Action ID

`0x46ae7c0b`

### SDK Action

```ts
const curveUsdLevCreateTransientAction = new dfs.actions.curveusd.CurveUsdLevCreateTransientAction(
    controllerAddress,
    from,
    collateralAmount,
    nBands,
    exchangeOrder,
    gasUsed
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param controllerAddress Address of the curveusd market controller
    /// @param from Address from which collAmount of collToken will be pulled
    /// @param collAmount Amount of collateral that the user is providing at first
    /// @param nBands Number of bands in which the collateral will be supplied for soft liquidation
    /// @param exData Exchange data for swapping (srcAmount will be amount of crvUSD to borrow and sell for collateral)
    /// @param gasUsed Only used as part of a strategy, estimated gas used for this tx
    struct Params {
        address controllerAddress;
        address from;
        uint256 collAmount;
        uint256 nBands;
        DFSExchangeData.ExchangeData exData;
        uint32 gasUsed;
    }
```

### Return Value

```solidity
return bytes32(debtGeneratedAndSold);
```

### Events and Logs

```solidity
emit ActionEvent("CurveUsdLevCreateTransient", logData);
logger.logActionDirectEvent("CurveUsdLevCreateTransient", logData);
bytes memory logData = abi.encode(params);
```
