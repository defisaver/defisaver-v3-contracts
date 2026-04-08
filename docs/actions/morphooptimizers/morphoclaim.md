---
icon: bluesky
---

# MorphoClaim

### Description

Claims Morpho rewards for any address

### Action ID

`0x50967400`

### SDK Action

```ts
const morphoClaimAction = new dfs.actions.morpho.MorphoClaimAction(
    onBehalfOf,
    claimable,
    proof
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param onBehalfOf address for which to claim
    /// @param claimable The overall claimable amount of token rewards
    /// @param proof The merkle proof which validates the claim
    struct Params {
        address onBehalfOf;
        uint256 claimable;
        bytes32[] proof;
    }
```

### Return Value

```solidity
return bytes32(amount);
```

### Events and Logs

```solidity
emit ActionEvent("MorphoClaim", logData);
logger.logActionDirectEvent("MorphoClaim", logData);
bytes memory logData = abi.encode(params);
```
