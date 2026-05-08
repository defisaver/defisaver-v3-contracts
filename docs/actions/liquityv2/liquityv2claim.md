---
icon: droplet
---

# LiquityV2Claim

### Description

Claims the caller’s accumulated collateral from their liquidated Troves after collateral seizure at liquidation

> **Notes**
>
> This action will revert on zero claimable collateral

### Action ID

`0x2679d495`

### SDK Action

```ts
const liquityV2ClaimAction = new dfs.actions.liquityV2.LiquityV2ClaimAction(
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
return bytes32(claimedColl);
```

### Events and Logs

```solidity
emit ActionEvent("LiquityV2Claim", logData);
logger.logActionDirectEvent("LiquityV2Claim", logData);
bytes memory logData = abi.encode(params);
```
