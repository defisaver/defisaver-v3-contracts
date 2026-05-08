# ➿ CurveUsdRepayTransient

### Description

Repays a curveusd position with a given amount of collateral

> **Notes**
>
> This action uses internal swapper with transient storage to repay debt

### Action ID

`0x9b788d56`

### SDK Action

```ts
const curveUsdRepayTransientAction = new dfs.actions.curveusd.CurveUsdRepayTransientAction(
    controllerAddress,
    to,
    exchangeOrder,
    gasUsed
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param controllerAddress Address of the curveusd market controller
    /// @param to Address which will receive any leftovers if amount received from selling is greater than debt
    /// @param exData exchange data for swapping (srcAmount will be amount of coll token sold)
    /// @param gasUsed Only used as part of a strategy, estimated gas used for this tx
    struct Params {
        address controllerAddress;
        address to;
        DFSExchangeData.ExchangeData exData;
        uint32 gasUsed;
    }
```

### Return Value

```solidity
return bytes32(debtTokenReceived);
```

### Events and Logs

```solidity
emit ActionEvent("CurveUsdRepayTransient", logData);
logger.logActionDirectEvent("CurveUsdRepayTransient", logData);
bytes memory logData = abi.encode(params);
```
