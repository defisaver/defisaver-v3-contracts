---
icon: hammer
---

# KingClaim

### Description

Action to Claim KING token as EtherFi reward on behalf of smart wallet

### Action ID

`0xb5997e1a`

### SDK Action

```ts
const kingClaimAction = new dfs.actions.basic.KingClaimAction(
    to,
    amount,
    merkleRoot,
    merkleProof
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param to Address where to send the KING token
    /// @param amount Amount of KING token to claim
    /// @param merkleRoot Merkle root of the claim
    /// @param merkleProof Merkle proof of the claim
    struct Params {
        address to;
        uint256 amount;
        bytes32 merkleRoot;
        bytes32[] merkleProof;
    }
```

### Return Value

```solidity
return bytes32(inputData.amount);
```

### Events and Logs

```solidity
```
