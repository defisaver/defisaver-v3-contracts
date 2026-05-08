---
icon: bluesky
---

# MorphoAaveV2Borrow

### Description

Borrow a token from Morpho

### Action ID

`0xb6af4eff`

### SDK Action

```ts
const morphoAaveV2BorrowAction = new dfs.actions.morpho.MorphoAaveV2BorrowAction(
    tokenAddr,
    amount,
    to,
    maxGasForMatching
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param tokenAddr The address of the token to be borrowed
    /// @param amount Amount of tokens to be borrowed
    /// @param to The address we are sending the borrowed tokens to
    /// @param maxGasForMatching - Max gas to spend on p2p matching
    struct Params {
        address tokenAddr;
        uint256 amount;
        address to;
        uint256 maxGasForMatching;
    }
```

### Return Value

```solidity
return bytes32(amount);
```

### Events and Logs

```solidity
emit ActionEvent("MorphoAaveV2Borrow", logData);
logger.logActionDirectEvent("MorphoAaveV2Borrow", logData);
bytes memory logData = abi.encode(params);
```
