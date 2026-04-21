---
icon: building-columns
---

# CompV3Transfer

### Description

Transfer amount of specified collateral to another wallet.

> **Notes**
>
> Transfer amount of supplied assets from one address to another. Amount type(uint).max will transfer the whole amount of supplied assets.

### Action ID

`0xc7443570`

### SDK Action

```ts
const compoundV3TransferAction = new dfs.actions.compoundV3.CompoundV3TransferAction(
    market,
    from,
    to,
    asset,
    amount
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param market Main Comet proxy contract that is different for each compound market
    /// @param from Address of the sender
    /// @param to Address of the receiver
    /// @param tokenAddr Address of the token to be transferred
    /// @param amount Amount of tokens to be transferred
    struct Params {
        address market;
        address from;
        address to;
        address tokenAddr;
        uint256 amount;
    }
```

### Return Value

```solidity
return bytes32(withdrawAmount);
```

### Events and Logs

```solidity
emit ActionEvent("CompV3Transfer", logData);
logger.logActionDirectEvent("CompV3Transfer", logData);
bytes memory logData = abi.encode(params);
```
