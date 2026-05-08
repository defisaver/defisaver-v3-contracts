---
icon: i
---

# InstPullTokens

### Description

Action for withdrawing tokens from Instadapp DSA

### Action ID

`0xc3d495a2`

### SDK Action

```ts
const instPullTokensAction = new dfs.actions.insta.InstPullTokensAction(
    dsaAddress,
    tokens,
    amounts,
    to
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param dsaAddress address of the DSA
    /// @param tokens array of addresses of the tokens to be withdrawn
    /// @param amounts array of amounts of the tokens to be withdrawn
    /// @param to address of the recipient
    struct Params {
        address dsaAddress;
        address[] tokens;
        uint256[] amounts;
        address to;
    }
```

### Return Value

```solidity
return bytes32(0);
```

### Events and Logs

```solidity
emit ActionEvent("InstPullTokens", logData);
logger.logActionDirectEvent("InstPullTokens", logData);
bytes memory logData = abi.encode(params);
```
