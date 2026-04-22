# ➰ CurveStethPoolDeposit

### Description

Action that deposits tokens into the Curve steth pool

### Action ID

`0x584de7d4`

### SDK Action

```ts
const curveStethPoolDepositAction = new dfs.actions.curve.CurveStethPoolDepositAction(
    from,
    to,
    amounts,
    minMintAmount
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param from Address where to pull tokens from
    /// @param to Address that will receive the LP tokens
    /// @param amounts Amount of each token to deposit
    /// @param minMintAmount Minimum amount of LP tokens to accept
    struct Params {
        address from;
        address to;
        uint256[2] amounts;
        uint256 minMintAmount;
    }
```

### Return Value

```solidity
return bytes32(receivedLp);
```

### Events and Logs

```solidity
emit ActionEvent("CurveStethPoolDeposit", logData);
logger.logActionDirectEvent("CurveStethPoolDeposit", logData);
bytes memory logData = abi.encode(params);
```
