---
icon: m
---

# McdDsrWithdraw

### Description

Action for withdrawing DAI from Maker DSR

### Action ID

`0x546cac0c`

### SDK Action

```ts
const makerDsrWithdrawAction = new dfs.actions.maker.MakerDsrWithdrawAction(
    amount,
    to
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param amount Amount of DAI to withdraw from DSR
    /// @param to Address that will receive the withdrawn DAI
    struct Params {
        uint256 amount;
        address to;
    }
```

### Return Value

```solidity
return bytes32(withdrawn);
```

### Events and Logs

```solidity
emit ActionEvent("McdDsrWithdraw", logData);
logger.logActionDirectEvent("McdDsrWithdraw", logData);
bytes memory logData = abi.encode(params);
```
