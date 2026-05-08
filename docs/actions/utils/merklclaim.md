---
icon: hammer
---

# MerklClaim

### Description

Claims Merkl rewards

> **Notes**
>
> You can claim Merkl rewards for anyone, but distinctTokens array should be empty in that case

### Action ID

`0x79b06cc7`

### SDK Action

```ts
const merklClaimAction = new dfs.actions.merkl.MerklClaimAction(
    users,
    tokens,
    amounts,
    proofs,
    distinctTokens,
    amountsClaimedPerDistinctToken,
    to
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param users Array of addresses who received the reward (from API)
    /// @param tokens The addresses of the tokens that we are claiming the reward in (from API)
    /// @param amounts Amounts to claim (from API)
    /// @param proofs Merkle proofs (from API)
    /// @param distinctTokens Distinct token addresses from tokens array if we want tokens to be sent from smart wallet
    /// @param amountsClaimedPerDistinctToken Amount of tokens to send from smart wallet, amount should match token address at same index in distinctTokens
    /// @param to The address to which the tokens claimed by smart wallet will be sent to
    struct Params {
        address[] users;
        address[] tokens;
        uint256[] amounts;
        bytes32[][] proofs;
        address[] distinctTokens;
        uint256[] amountsClaimedPerDistinctToken;
        address to;
    }
```

### Return Value

```solidity
return bytes32(0);
```

### Events and Logs

```solidity
emit ActionEvent("MerklClaim", logData);
logger.logActionDirectEvent("MerklClaim", logData);
bytes memory logData = abi.encode(params);
```
