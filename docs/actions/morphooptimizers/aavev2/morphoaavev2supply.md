---
icon: bluesky
---

# MorphoAaveV2Supply

### Description

Supply a token to Morpho

### Action ID

`0x59717250`

### SDK Action

```ts
const morphoAaveV2SupplyAction = new dfs.actions.morpho.MorphoAaveV2SupplyAction(
    tokenAddr,
    amount,
    from,
    onBehalf,
    maxGasForMatching
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param tokenAddr The address of the token to be deposited
    /// @param amount Amount of tokens to be deposited
    /// @param from Where are we pulling the supply tokens amount from
    /// @param onBehalf For what user we are supplying the tokens, defaults to user's wallet
    /// @param maxGasForMatching Max gas to spend on p2p matching
    struct Params {
        address tokenAddr;
        uint256 amount;
        address from;
        address onBehalf;
        uint256 maxGasForMatching;
    }
```

### Return Value

```solidity
return bytes32(amount);
```

### Events and Logs

```solidity
emit ActionEvent("MorphoAaveV2Supply", logData);
logger.logActionDirectEvent("MorphoAaveV2Supply", logData);
bytes memory logData = abi.encode(params);
```
