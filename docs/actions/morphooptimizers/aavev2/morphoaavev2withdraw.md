---
icon: bluesky
---

# MorphoAaveV2Withdraw

### Description

Withdraw a token from Morpho

### Action ID

`0x914eb1c7`

### SDK Action

```ts
const morphoAaveV2WithdrawAction = new dfs.actions.morpho.MorphoAaveV2WithdrawAction(
    tokenAddr,
    amount,
    to
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param tokenAddr The address of the token to be withdrawn
    /// @param amount Amount of tokens to be withdrawn
    /// @param to Where the withdrawn tokens will be sent
    struct Params {
        address tokenAddr;
        uint256 amount;
        address to;
    }
```

### Return Value

```solidity
return bytes32(amount);
```

### Events and Logs

```solidity
emit ActionEvent("MorphoAaveV2Withdraw", logData);
logger.logActionDirectEvent("MorphoAaveV2Withdraw", logData);
bytes memory logData = abi.encode(params);
```
