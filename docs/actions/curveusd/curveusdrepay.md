# ➿ CurveUsdRepay

### Description

Repays a curveusd position with a given amount of collateral

> **Notes**
>
> This action uses internal swapper to repay debt

### Action ID

`0x42cd8e33`

### SDK Action

```ts
const curveUsdRepayAction = new dfs.actions.curveusd.CurveUsdRepayAction(
    controllerAddress,
    collAmount,
    to,
    minAmount,
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
    /// @param collAmount Amount of coll we're going to sell for crvUsd to repay debt
    /// @param to Where to send the leftover funds if full close
    /// @param minAmount Minimum amount of crvUSD to receive after sell
    /// @param additionalData Additional data where curve swap path is encoded
    /// @param gasUsed Only used as part of a strategy, estimated gas used for this tx
    /// @param dfsFeeDivider Fee divider, if a non standard fee is set it will check for custom fee
    struct Params {
        address controllerAddress;
        uint256 collAmount;
        address to;
        uint256 minAmount;
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
emit ActionEvent("CurveUsdRepay", logData);
logger.logActionDirectEvent("CurveUsdRepay", logData);
bytes memory logData = abi.encode(params);
```
