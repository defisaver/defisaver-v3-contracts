---
icon: droplet
---

# LiquityV2Supply

### Description

Supplies a token to a LiquityV2 trove on a specific market

### Action ID

`0xaaf3b40f`

### SDK Action

```ts
const liquityV2SupplyAction = new dfs.actions.liquityV2.LiquityV2SupplyAction(
    market,
    from,
    collToken,
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
    /// @param troveId The ID of the trove to supply the tokens to
    /// @param amount The amount of tokens to supply
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
emit ActionEvent("LiquityV2Supply", logData);
logger.logActionDirectEvent("LiquityV2Supply", logData);
bytes memory logData = abi.encode(params);
```
