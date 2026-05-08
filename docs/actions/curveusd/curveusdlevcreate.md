# ➿ CurveUsdLevCreate

### Description

Creates a new curveusd leveraged position with a given amount of collateral and debt

> **Notes**
>
> This action uses internal swapper to create a loan

### Action ID

`0x2465d76e`

### SDK Action

```ts
const curveUsdLevCreateAction = new dfs.actions.curveusd.CurveUsdLevCreateAction(
    controllerAddress,
    collateralAmount,
    debtAmount,
    minAmount,
    nBands,
    from,
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
    /// @param collAmount Amount of collateral asset to supply
    /// @param debtAmount Amount of crvUSD to borrow (will be sold for collateral)
    /// @param minAmount Minimum amount of crvUSD to receive after sell
    /// @param nBands Number of bands in which the collateral will be supplied for soft liquidation
    /// @param from Address from which to pull collateral asset, will default to user's wallet
    /// @param additionalData Additional data where curve swap path is encoded
    /// @param gasUsed Only used as part of a strategy, estimated gas used for this tx
    /// @param dfsFeeDivider Fee divider, if a non standard fee is set it will check for custom fee
    struct Params {
        address controllerAddress;
        uint256 collAmount;
        uint256 debtAmount;
        uint256 minAmount;
        uint256 nBands;
        address from;
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
emit ActionEvent("CurveUsdLevCreate", logData);
logger.logActionDirectEvent("CurveUsdLevCreate", logData);
bytes memory logData = abi.encode(params);
```
