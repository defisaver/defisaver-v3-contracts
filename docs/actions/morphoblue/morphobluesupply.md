---
icon: bluesky
---

# MorphoBlueSupply

### Description

Supply a token to Morpho Blue market for interest

### Action ID

`0x9200fb32`

### SDK Action

```ts
const morphoBlueSupplyAction = new dfs.actions.morpho-blue.MorphoBlueSupplyAction(
    loanToken,
    collateralToken,
    oracle,
    irm,
    lltv,
    supplyAmount,
    from,
    onBehalf
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param marketParams Market params of specified Morpho Blue market
    /// @param supplyAmount The amount of assets to supply.
    /// @param from The Address from which to pull tokens to be supplied for interest
    /// @param onBehalf The address that will own the shares
    struct Params {
        MarketParams marketParams;
        uint256 supplyAmount;
        address from;
        address onBehalf;
    }
```

### Return Value

```solidity
return bytes32(amount);
```

### Events and Logs

```solidity
emit ActionEvent("MorphoBlueSupply", logData);
logger.logActionDirectEvent("MorphoBlueSupply", logData);
bytes memory logData = abi.encode(params);
```
