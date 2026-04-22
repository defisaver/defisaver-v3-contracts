# ➰ CurveMintCrv

### Description

Action that mints Crv tokens based on up to 8 gauges

### Action ID

`0x643105e3`

### SDK Action

```ts
const curveMintCrvAction = new dfs.actions.curve.CurveMintCrvAction(
    gaugeAddrs,
    receiver
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param gaugeAddrs Array of up to 8 gauge addresses determining Crv issuance
    /// @param receiver Address that will receive the Crv issuance
    struct Params {
        address[8] gaugeAddrs;
        address receiver;
    }
```

### Return Value

```solidity
return bytes32(minted);
```

### Events and Logs

```solidity
emit ActionEvent("CurveMintCrv", logData);
logger.logActionDirectEvent("CurveMintCrv", logData);
bytes memory logData = abi.encode(params);
```

