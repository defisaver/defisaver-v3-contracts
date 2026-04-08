---
icon: droplet
---

# LiquityV2SPClaimColl

### Description

This action is only needed in the case a user has no deposit but still has remaining stashed Coll gains.

### Action ID

`0x76f835f0`

### SDK Action

```ts
const liquityV2SPClaimCollAction = new dfs.actions.liquityV2.LiquityV2SPClaimCollAction(
    market,
    to
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param market The address of the LiquityV2 market (collateral branch)
    /// @param to The address to send the tokens to
    struct Params {
        address market;
        address to;
    }
```

### Return Value

```solidity
return bytes32(claimedCollAmount);
```

### Events and Logs

```solidity
emit ActionEvent("LiquityV2SPClaimColl", logData);
logger.logActionDirectEvent("LiquityV2SPClaimColl", logData);
bytes memory logData = abi.encode(params);
```
