---
icon: hammer
---

# TokenBalance

### Description

TokenBalance - Returns the balance of a token for a given address.

### Action ID

`0x019d9978`

### SDK Action

```ts
const tokenBalanceAction = new dfs.actions.basic.TokenBalanceAction(
    tokenAddr,
    holderAddr
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param tokenAddr Address of the token
    /// @param holderAddr Address of the holder
    struct Params {
        address tokenAddr;
        address holderAddr;
    }
```

### Return Value

```solidity
return bytes32(inputData.tokenAddr.getBalance(inputData.holderAddr));
```

### Events and Logs

```solidity
```
