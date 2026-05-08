---
icon: sigma
---

# EulerV2Supply

### Description

Supply assets to a Euler vault and gets eTokens vault shares

### Action ID

`0xc9533e95`

### SDK Action

```ts
const eulerV2SupplyAction = new dfs.actions.eulerV2.EulerV2SupplyAction(
    vault,
    tokenAddress,
    account,
    from,
    amount,
    enableAsColl
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param vault The address of the supply vault
    /// @param account The address of the Euler account, defaults to user's wallet
    /// @param from The address from which to pull tokens to be supplied
    /// @param amount The amount of assets to supply
    /// @param enableAsColl Whether to enable supply vault as collateral
    struct Params {
        address vault;
        address account;
        address from;
        uint256 amount;
        bool enableAsColl;
    }
```

### Return Value

```solidity
return bytes32(supplyAmount);
```

### Events and Logs

```solidity
emit ActionEvent("EulerV2Supply", logData);
logger.logActionDirectEvent("EulerV2Supply", logData);
bytes memory logData = abi.encode(params);
```
