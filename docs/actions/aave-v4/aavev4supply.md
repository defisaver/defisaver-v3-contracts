---
icon: ghost
---

# AaveV4Supply

### Description

Supply a token to an Aave spoke.

### Action ID
`0x06ecb781`

### SDK Action
````ts
const aaveV4SupplyAction = new dfs.actions.aavev4.AaveV4SupplyAction(
    spoke,
    onBehalf,
    from,
    reserveId,
    amount,
    useAsCollateral,
    tokenAddress
);
````

### Action Type
`STANDARD_ACTION`

### Input Parameters
```solidity
    /// @param spoke Address of the spoke.
    /// @param onBehalf Address to supply tokens on behalf of. Defaults to the user's wallet if not provided.
    /// @param from Address from which to pull collateral asset.
    /// @param reserveId Reserve id.
    /// @param amount Amount of tokens to supply.
    /// @param useAsCollateral Whether to use the tokens as collateral.
    struct Params {
        address spoke;
        address onBehalf;
        address from;
        uint256 reserveId;
        uint256 amount;
        bool useAsCollateral;
    }
```

### Return Value
```solidity
return bytes32(amount);
```

### Events and Logs
```solidity
emit ActionEvent("AaveV4Supply", logData);
logger.logActionDirectEvent("AaveV4Supply", logData);
bytes memory logData = abi.encode(params);
```
