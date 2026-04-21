---
icon: bluesky
---

# MorphoAaveV2Payback

### Action ID

`0xe7eeb647`

### SDK Action

```ts
const morphoAaveV2PaybackAction = new dfs.actions.morpho.MorphoAaveV2PaybackAction(
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
    /// @param tokenAddr The address of the token to be paid back
    /// @param amount Amount of tokens to be paid back
    /// @param from Where are we pulling the payback tokens amount from
    /// @param onBehalf For what user we are paying back the debt, defaults to user's wallet
    struct Params {
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
emit ActionEvent("MorphoAaveV2Payback", logData);
logger.logActionDirectEvent("MorphoAaveV2Payback", logData);
bytes memory logData = abi.encode(params);
```
