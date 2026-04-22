---
icon: m
---

# McdDsrDeposit

### Description

Action for depositing DAI into Maker DSR

### Action ID

`0x17b217d0`

### SDK Action

```ts
const makerDsrDepositAction = new dfs.actions.maker.MakerDsrDepositAction(
    amount,
    from
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param amount Amount of DAI to deposit into DSR
    /// @param from Address from which the DAI will be pulled
    struct Params {
        uint256 amount;
        address from;
    }
```

### Return Value

```solidity
return bytes32(deposited);
```

### Events and Logs

```solidity
emit ActionEvent("McdDsrDeposit", logData);
logger.logActionDirectEvent("McdDsrDeposit", logData);
bytes memory logData = abi.encode(params);
```
