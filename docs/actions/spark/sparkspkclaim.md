---
icon: sparkles
---

# SparkSPKClaim

### Description

Claims SPK token from Spark Rewards contract

### Action ID

`0x0c7abfae`

### SDK Action

```ts
const sparkSPKClaimAction = new dfs.actions.SparkSPKClaimAction(
    rewardContract,
    to,
    epoch,
    account,
    token,
    cumulativeAmount,
    expectedMerkleRoot,
    merkleProof
);

```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param rewardContract Address of the Spark Rewards contract
    /// @param to Address to send the SPK token to
    /// @param epoch The epoch number for which to claim rewards
    /// @param account Address of the account claiming rewards
    /// @param token Token address being claimed
    /// @param cumulativeAmount Total amount claimable up to this point
    /// @param expectedMerkleRoot Expected merkle root for verification
    /// @param merkleProof Merkle proof for verification
    struct Params {
        address rewardContract;
        address to;
        uint256 epoch;
        address account;
        address token;
        uint256 cumulativeAmount;
        bytes32 expectedMerkleRoot;
        bytes32[] merkleProof;
    }
```

### Return Value

```solidity
return bytes32(claimedAmount);
```

### Events and Logs

```solidity
emit ActionEvent("SparkSPKClaim", logData);
logger.logActionDirectEvent("SparkSPKClaim", logData);
bytes memory logData = abi.encode(params);
```
