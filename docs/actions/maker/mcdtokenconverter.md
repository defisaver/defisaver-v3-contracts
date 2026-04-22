---
icon: m
---

# McdTokenConverter

### Description

Convert MKR -> SKY and DAI <-> USDS

### Action ID

`0xdd5b6f15`

### SDK Action

```ts
const makerTokenConverterAction = new dfs.actions.maker.MakerTokenConverterAction(
    tokenAddr,
    from,
    to,
    amount
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param tokenAddr Address of the token to convert
    /// @param from Address where to pull the tokens from
    /// @param to Address that will receive the converted tokens
    /// @param amount Amount of tokens to convert
    struct Params {
        address tokenAddr;
        address from;
        address to;
        uint256 amount;
    }
```

### Return Value

```solidity
return bytes32(newTokenAmount);
```

### Events and Logs

```solidity
emit ActionEvent("McdTokenConverter", logData);
logger.logActionDirectEvent("McdTokenConverter", logData);
bytes memory logData = abi.encode(params);
```
