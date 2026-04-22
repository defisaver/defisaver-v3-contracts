---
icon: droplet
---

# LiquityClose

### Description

Action for closing a liquity trove

### Action ID

`0xfaf0f6a9`

### SDK Action

```ts
const liquityCloseAction = new dfs.actions.liquity.LiquityCloseAction(
    from,
    to
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param from Address where to pull the LUSD tokens from
    /// @param to Address that will receive the collateral
    struct Params {
        address from;
        address to;
    }
```

### Return Value

```solidity
return bytes32(coll);
```

### Events and Logs

```solidity
emit ActionEvent("LiquityClose", logData);
logger.logActionDirectEvent("LiquityClose", logData);
bytes memory logData = abi.encode(params);
```
