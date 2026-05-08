---
icon: wave
---

# FluidClaim

### Description

Claim rewards from Fluid protocol.

### Action ID

`0x6782bd80`

### SDK Action

```ts
const fluidClaimAction = new dfs.actions.fluid.FluidClaimAction(
    to,
    cumulativeAmount,
    positionId,
    positionType,
    cycle,
    merkleProof,
    metadata
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param to Address to send the claimed tokens to.
    /// @param cumulativeAmount Total cumulative amount of tokens to claim (Obtained from API).
    /// @param positionId The ID of the position. For earn positions, this will be fToken address padded with zeros (Obtained from API).
    /// @param positionType The type of the position (Obtained from API).
    /// @param cycle The cycle of the rewards program (Obtained from API).
    /// @param merkleProof The Merkle proof to claim the rewards (Obtained from API).
    /// @param metadata Additional metadata for the claim. (Obtained from API).
    struct Params {
        address to;
        uint256 cumulativeAmount;
        bytes32 positionId;
        uint8 positionType;
        uint256 cycle;
        bytes32[] merkleProof;
        bytes metadata;
    }
```

### Return Value

```solidity
return bytes32(amount);
```

### Events and Logs

```solidity
emit ActionEvent("FluidClaim", logData);
logger.logActionDirectEvent("FluidClaim", logData);
bytes memory logData = abi.encode(params);
```
