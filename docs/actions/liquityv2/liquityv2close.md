---
icon: droplet
---

# LiquityV2Close

### Description

Closes a LiquityV2 trove on a specific market

> **Notes**
>
> Upon closing a trove on LiquityV2, fixed fee of 0.0375 WETH during opening is returned to the user

### Action ID

`0x3dcf3785`

### SDK Action

```ts
const liquityV2CloseAction = new dfs.actions.liquityV2.LiquityV2CloseAction(
    market,
    from,
    to,
    troveId
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param market The address of the LiquityV2 market (collateral branch)
    /// @param from The address to pull the bold tokens from
    /// @param to The address to send the tokens to
    /// @param troveId The ID of the trove to close
    struct Params {
        address market;
        address from;
        address to;
        uint256 troveId;
    }
```

### Return Value

```solidity
return bytes32(collAmount);
```

### Events and Logs

```solidity
emit ActionEvent("LiquityV2Close", logData);
logger.logActionDirectEvent("LiquityV2Close", logData);
bytes memory logData = abi.encode(params);
```
