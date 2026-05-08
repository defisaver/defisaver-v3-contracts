---
icon: building-columns
---

# CompSupply

### Description

Supply a token to Compound.

> **Notes**
>
> If amount == type(uint256).max we are getting the whole balance of the user's wallet

### Action ID

`0x4ce56950`

### SDK Action

```ts
const compoundSupplyAction = new dfs.actions.compound.CompoundSupplyAction(
    cTokenAddr,
    amount,
    from,
    enableAsColl
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param cTokenAddr Address of the cToken token to supply
    /// @param amount Amount of tokens to be supplied
    /// @param from Address where we are pulling the underlying tokens from
    /// @param enableAsColl If the supply asset should be collateral
    struct Params {
        address cTokenAddr;
        uint256 amount;
        address from;
        bool enableAsColl;
    }
```

### Return Value

```solidity
return bytes32(withdrawAmount);
```

### Events and Logs

```solidity
emit ActionEvent("CompSupply", logData);
logger.logActionDirectEvent("CompSupply", logData);
bytes memory logData = abi.encode(params);
```
