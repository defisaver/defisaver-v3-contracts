---
icon: building-columns
---

# CompV3Supply

### Description

Supply a token to CompoundV3.

### Action ID

`0x71643f58`

### SDK Action

```ts
const compoundV3SupplyAction = new dfs.actions.compoundV3.CompoundV3SupplyAction(
    market,
    tokenAddr,
    amount,
    from,
    onBehalf
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param market Main Comet proxy contract that is different for each compound market
    /// @param tokenAddr  Address of the token we are supplying
    /// @param amount Amount in wei of tokens we are supplying
    /// @param from Address from which we are pulling the tokens
    /// @param onBehalf Address where we are supplying the tokens to
    struct Params {
        address market;
        address tokenAddr;
        uint256 amount;
        address from;
        address onBehalf;
    }
```

### Return Value

```solidity
return bytes32(withdrawAmount);
```

### Events and Logs

```solidity
emit ActionEvent("CompV3Supply", logData);
logger.logActionDirectEvent("CompV3Supply", logData);
bytes memory logData = abi.encode(params);
```
