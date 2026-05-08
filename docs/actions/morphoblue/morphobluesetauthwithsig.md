---
icon: bluesky
---

# MorphoBlueSetAuthWithSig

### Description

Allow or disallow an address to manage MorphoBlue position on user's wallet

### Action ID

`0x382f0f62`

### SDK Action

```ts
const morphoBlueSetAuthWithSigAction = new dfs.actions.morpho-blue.MorphoBlueSetAuthWithSigAction(
    authorizer,
    authorized,
    isAuthorized,
    nonce,
    deadline,
    v,
    r,
    s
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param authorization Authorization object
    /// @param signature Signature object
    struct Params {
        Authorization authorization;
        Signature signature;
    }
```

### Return Value

```solidity
return bytes32(0);
```

### Events and Logs

```solidity
emit ActionEvent("MorphoBlueSetAuthWithSig", logData);
logger.logActionDirectEvent("MorphoBlueSetAuthWithSig", logData);
bytes memory logData = abi.encode(params);
```
