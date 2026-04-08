# ➰ CurveClaimFees

### Description

Action that claims 3Crv rewards from Fee Distributor

> **Notes**
>
> if \_claimFor != \_receiver the \_claimFor address needs to approve the user's wallet to pull 3Crv token

### Action ID

`0xaf0660d3`

### SDK Action

```ts
const curveClaimFeesAction = new dfs.actions.curve.CurveClaimFeesAction(
    claimFor,
    receiver
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param claimFor Address for which to claim fees
    /// @param receiver Address that will receive the tokens
    struct Params {
        address claimFor;
        address receiver;
    }
```

### Return Value

```solidity
return bytes32(claimed);
```

### Events and Logs

```solidity
emit ActionEvent("CurveClaimFees", logData);
logger.logActionDirectEvent("CurveClaimFees", logData);
bytes memory logData = abi.encode(params);
```
