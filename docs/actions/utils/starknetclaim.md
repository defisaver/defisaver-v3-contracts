---
icon: hammer
---

# StarknetClaim

### Description

Action that helps Smart wallets claim Starknet tokens

### Action ID

`0x33e5cbf6`

### SDK Action

```ts
const starknetClaimAction = new dfs.actions.basic.StarknetClaimAction(
    payload,
    gasPrice
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param payload Array of payloads
    /// @param gasPrice Gas price
    struct Params {
        uint256[] payload;
        uint256 gasPrice;
    }
```

### Return Value

```solidity
```

### Events and Logs

```solidity
```
