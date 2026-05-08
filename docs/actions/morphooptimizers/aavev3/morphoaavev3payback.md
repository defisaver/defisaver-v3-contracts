---
icon: bluesky
---

# MorphoAaveV3Payback

### Description

Payback a token to Morpho AaveV3

### Action ID

`0x3bd16d55`

### SDK Action

```ts
const morphoAaveV3PaybackAction = new dfs.actions.morpho.aaveV3.MorphoAaveV3PaybackAction(
    emodeId,
    tokenAddr,
    amount,
    from,
    onBehalf
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param emodeId Type of emode we are entering in, each one is different deployment on Morpho
    /// @param tokenAddr The address of the token to be paid back
    /// @param amount Amount of tokens to be paid back
    /// @param from Where are we pulling the payback tokens amount from
    /// @param onBehalf For what user we are paying back the debt, defaults to user's wallet
    struct Params {
        uint256 emodeId;
        address tokenAddr;
        uint256 amount;
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
emit ActionEvent("MorphoAaveV3Payback", logData);
logger.logActionDirectEvent("MorphoAaveV3Payback", logData);
bytes memory logData = abi.encode(params);
```
