---
icon: droplet
---

# LiquityClaim

### Description

Action for claiming collateral from Liquity

> **Notes**
>
> Claims remaining collateral from the user's closed Trove

### Action ID

`0x9e9da920`

### SDK Action

```ts
const liquityClaimAction = new dfs.actions.liquity.LiquityClaimAction(
    to
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param to Address that will receive the collateral
    struct Params {
        address to;
    }
```

### Return Value

```solidity
return bytes32(claimedColl);
```

### Events and Logs

```solidity
emit ActionEvent("LiquityClaim", logData);
logger.logActionDirectEvent("LiquityClaim", logData);
bytes memory logData = abi.encode(params);
```
