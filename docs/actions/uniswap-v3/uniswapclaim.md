---
icon: alicorn
---

# UniswapClaim

### Description

UniswapClaim

### Action ID

`0x48d60efb`

### SDK Action

```ts
const uniswapClaimAction = new dfs.actions.UniswapClaimAction(
    index,
    to,
    amount,
    merkleProof
);

```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param index Index of the claim in the merkle tree
    /// @param to Address where to send the claimed UNI
    /// @param amount Amount of UNI allocated to the smart wallet in the merkle tree
    /// @param merkleProof Merkle proof of the claim
    struct Params {
        uint256 index;
        address to;
        uint256 amount;
        bytes32[] merkleProof;
    }
```

### Return Value

```solidity
return bytes32(claimedAmount);
```

### Events and Logs

```solidity
emit ActionEvent("UniswapClaim", logData);
logger.logActionDirectEvent("UniswapClaim", logData);
bytes memory logData = abi.encode(params);
```
