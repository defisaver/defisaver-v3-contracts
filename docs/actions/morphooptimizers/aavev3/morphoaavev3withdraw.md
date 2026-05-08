---
icon: bluesky
---

# MorphoAaveV3Withdraw

### Description

Withdraw a token from Morpho AaveV3

### Action ID

`0x1f2dba0b`

### SDK Action

```ts
const morphoAaveV3WithdrawAction = new dfs.actions.morpho.aaveV3.MorphoAaveV3WithdrawAction(
    emodeId,
    tokenAddr,
    amount,
    to,
    onBehalf,
    withdrawAsColl,
    maxIterations
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param emodeId Type of emode we are entering in, each one is different deployment on Morpho
    /// @param tokenAddr The address of the token to be withdrawn
    /// @param amount Amount of tokens to be withdrawn
    /// @param to Where the withdrawn tokens will be sent
    /// @param onBehalf For what user we are withdrawing the tokens, defaults to user's wallet
    /// @param withdrawAsColl If we want to withdraw from collateral or from pure supply
    /// @param maxIterations Max number of iterations for p2p matching, 0 will use default num of iterations
    struct Params {
        uint256 emodeId;
        address tokenAddr;
        uint256 amount;
        address to;
        address onBehalf;
        bool withdrawAsColl;
        uint256 maxIterations;
    }
```

### Return Value

```solidity
return bytes32(amount);
```

### Events and Logs

```solidity
emit ActionEvent("MorphoAaveV3Withdraw", logData);
logger.logActionDirectEvent("MorphoAaveV3Withdraw", logData);
bytes memory logData = abi.encode(params);
```
