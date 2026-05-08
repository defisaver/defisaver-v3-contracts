# ➿ CurveUsdBorrow

### Description

Action that borrows crvUSD from user's wallet curveusd position

### Action ID

`0x2f22c507`

### SDK Action

```ts
const curveUsdBorrowAction = new dfs.actions.curveusd.CurveUsdBorrowAction(
    controllerAddress,
    to,
    debtAmount
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param controllerAddress Address of the curveusd market controller
    /// @param to Address that will receive the borrowed crvUSD, will default to user's wallet
    /// @param debtAmount Amount of crvUSD to borrow (does not support uint.max)
    struct Params {
        address controllerAddress;
        address to;
        uint256 debtAmount;
    }
```

### Return Value

```solidity
return bytes32(generatedAmount);
```

### Events and Logs

```solidity
emit ActionEvent("CurveUsdBorrow", logData);
logger.logActionDirectEvent("CurveUsdBorrow", logData);
bytes memory logData = abi.encode(params);
```
