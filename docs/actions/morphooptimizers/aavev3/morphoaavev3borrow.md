---
icon: bluesky
---

# MorphoAaveV3Borrow

### Description

Borrow a token from Morpho

### Action ID

`0x5ffbd7fe`

### SDK Action

```ts
const morphoAaveV3BorrowAction = new dfs.actions.morpho.aaveV3.MorphoAaveV3BorrowAction(
    emodeId,
    tokenAddr,
    amount,
    to,
    onBehalf,
    maxIterations
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param emodeId Type of emode we are entering in, each one is different deployment on Morpho
    /// @param tokenAddr The address of the token to be borrowed
    /// @param amount Amount of tokens to be borrowed
    /// @param to The address we are sending the borrowed tokens to
    /// @param onBehalf For what user we are borrowing the tokens, defaults to user's wallet
    /// @param maxIterations Max number of iterations for p2p matching, 0 will use default num of iterations
    struct Params {
        uint256 emodeId;
        address tokenAddr;
        uint256 amount;
        address to;
        address onBehalf;
        uint256 maxIterations;
    }
```

### Return Value

```solidity
return bytes32(amount);
```

### Events and Logs

```solidity
emit ActionEvent("MorphoAaveV3Borrow", logData);
logger.logActionDirectEvent("MorphoAaveV3Borrow", logData);
bytes memory logData = abi.encode(params);
```
