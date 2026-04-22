---
icon: bluesky
---

# MorphoAaveV3Supply

### Description

Supply a token to Morpho AaveV3

### Action ID

`0x695a7da7`

### SDK Action

```ts
const morphoAaveV3SupplyAction = new dfs.actions.morpho.aaveV3.MorphoAaveV3SupplyAction(
    emodeId,
    tokenAddr,
    amount,
    from,
    onBehalf,
    supplyAsColl,
    maxIterations
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param emodeId Type of emode we are entering in, each one is different deployment on Morpho
    /// @param tokenAddr The address of the token to be deposited
    /// @param amount Amount of tokens to be deposited
    /// @param from Where are we pulling the supply tokens amount from
    /// @param onBehalf For what user we are supplying the tokens, defaults to user's wallet
    /// @param supplyAsColl Whether to supplyAsCollateral or regular supply
    /// @param maxIterations Max number of iterations for p2p matching, 0 will use default num of iterations
    struct Params {
        uint256 emodeId;
        address tokenAddr;
        uint256 amount;
        address from;
        address onBehalf;
        bool supplyAsColl;
        uint256 maxIterations;
    }
```

### Return Value

```solidity
return bytes32(amount);
```

### Events and Logs

```solidity
emit ActionEvent("MorphoAaveV3Supply", logData);
logger.logActionDirectEvent("MorphoAaveV3Supply", logData);
bytes memory logData = abi.encode(params);
```
