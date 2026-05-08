---
icon: bluesky
---

# MorphoBlueClaim

### Description

Claims rewards for MORPHO users

### Action ID

`0x07f9b8e2`

### SDK Action

```ts
const morphoBlueClaimAction = new dfs.actions.morpho-blue.MorphoBlueClaimAction(
    to,
    token,
    distributor,
    claimable,
    merkleProof
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param to The address to which to send the reward tokens.
    /// @param token The address of the token to claim.
    /// @param distributor The address of the morpho distributor contract.
    /// @param claimable The overall claimable amount of token rewards.
    /// @param merkleProof The merkle proof to claim the rewards.
    struct Params {
        address to;
        address token;
        address distributor;
        uint256 claimable;
        bytes32[] merkleProof;
    }
```

### Return Value

```solidity
return bytes32(claimed);
```

### Events and Logs

```solidity
emit ActionEvent("MorphoBlueClaim", logData);
logger.logActionDirectEvent("MorphoBlueClaim", logData);
bytes memory logData = abi.encode(params);
```
