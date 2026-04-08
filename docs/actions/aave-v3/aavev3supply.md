---
icon: ghost
---

# AaveV3Supply

### Description

Supply a token to an Aave market

> **Notes**
>
> User deposits tokens to the Aave protocol. User needs to approve its wallet to pull the tokens being supplied

### Action ID

`0xfc33bf00`

### SDK Action

```ts
const aaveV3SupplyAction = new dfs.actions.aaveV3.AaveV3SupplyAction(
    useDefaultMarket,
    market,
    amount,
    from,
    tokenAddress,
    assetId,
    enableAsColl,
    useOnBehalf,
    onBehalf
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param amount Amount of tokens to supply.
    /// @param from Address to send the supply tokens from.
    /// @param assetId Asset id.
    /// @param enableAsColl Whether to enable as collateral.
    /// @param useDefaultMarket Whether to use the default market.
    /// @param useOnBehalf Whether to use on behalf.
    /// @param market Aave Market address.
    /// @param onBehalf Address to send the supply tokens on behalf of. Defaults to the user's wallet.
    struct Params {
        uint256 amount;
        address from;
        uint16 assetId;
        bool enableAsColl;
        bool useDefaultMarket;
        bool useOnBehalf;
        address market;
        address onBehalf;
    }
```

### Return Value

```solidity
return bytes32(supplyAmount);
```

### Events and Logs

```solidity
emit ActionEvent("AaveV3Supply", logData);
logger.logActionDirectEvent("AaveV3Supply", logData);
bytes memory logData = abi.encode(params);
```
