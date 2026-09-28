---
icon: bluesky
---

# MidnightPaybackDirect

### Description

Repay debt by repaying debt units at a face value of 1.

### Action ID

`0x410d1066`

### SDK Action

```ts
const midnightPaybackDirectAction = new dfs.actions.midnight.MidnightPaybackDirectAction(
    marketId,
    onBehalf,
    from,
    amount
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param marketId Market id.
    /// @param onBehalf Address to payback tokens on behalf of. Defaults to the user's wallet if not provided.
    /// @param from Address from which to pull the payback tokens.
    /// @param amount Amount of tokens to payback. Send type(uint).max to payback whole amount.
    struct Params {
        bytes32 marketId;
        address onBehalf;
        address from;
        uint256 amount;
    }
```

### Return Value

```solidity
return bytes32(amount);
```

### Events and Logs

```solidity
emit ActionEvent("MidnightPaybackDirect", logData);
logger.logActionDirectEvent("MidnightPaybackDirect", logData);
bytes memory logData = abi.encode(params);
```
