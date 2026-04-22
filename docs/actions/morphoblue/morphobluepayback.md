---
icon: bluesky
---

# MorphoBluePayback

### Description

Payback a token to Morpho Blue market

### Action ID

`0xca8b1df9`

### SDK Action

```ts
const morphoBluePaybackAction = new dfs.actions.morpho-blue.MorphoBluePaybackAction(
    loanToken,
    collateralToken,
    oracle,
    irm,
    lltv,
    paybackAmount,
    from,
    onBehalf
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param marketParams Market params of specified Morpho Blue market
    /// @param paybackAmount The amount of tokens to payback (uint.max for full debt repayment)
    /// @param from The Address from which to pull tokens to be repaid
    /// @param onBehalf The address that will have its debt reduced
    struct Params {
        MarketParams marketParams;
        uint256 paybackAmount;
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
emit ActionEvent("MorphoBluePayback", logData);
logger.logActionDirectEvent("MorphoBluePayback", logData);
bytes memory logData = abi.encode(params);
```
