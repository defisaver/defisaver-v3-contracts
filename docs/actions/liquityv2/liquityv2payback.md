---
icon: droplet
---

# LiquityV2Payback

### Description

Payback a bold amount on a LiquityV2 trove on a specific market

### Action ID

`0x1141b0a3`

### SDK Action

```ts
const liquityV2PaybackAction = new dfs.actions.liquityV2.LiquityV2PaybackAction(
    market,
    from,
    troveId,
    amount
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param market The address of the LiquityV2 market (collateral branch)
    /// @param from The address to pull the tokens from
    /// @param troveId The ID of the trove to payback the tokens to
    /// @param amount The amount of tokens to payback
    struct Params {
        address market;
        address from;
        uint256 troveId;
        uint256 amount;
    }
```

### Return Value

```solidity
return bytes32(amount);
```

### Events and Logs

```solidity
emit ActionEvent("LiquityV2Payback", logData);
logger.logActionDirectEvent("LiquityV2Payback", logData);
bytes memory logData = abi.encode(params);
```
