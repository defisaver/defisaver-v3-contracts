---
icon: b
---

# BprotocolLiquitySPDeposit

### Description

BprotocolLiquitySPDeposit - Action that deposits LUSD into Bprotocol

### Action ID

`0x226d4a83`

### SDK Action

```ts
const bprotocolLiquitySPDepositAction = new dfs.actions.bprotocol.BprotocolLiquitySPDepositAction(
    lusdAmount,
    from,
    lqtyTo
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param lusdAmount Amount of LUSD to deposit into Bprotocol
    /// @param from Address from where the LUSD is being pulled
    /// @param lqtyTo Address that will recieve LQTY rewards
    struct Params {
        uint256 lusdAmount;
        address from;
        address lqtyTo;
    }
```

### Return Value

```solidity
return bytes32(deposited);
```

### Events and Logs

```solidity
emit ActionEvent("BprotocolLiquitySPDeposit", logData);
logger.logActionDirectEvent("BprotocolLiquitySPDeposit", logData);
bytes memory logData = abi.encode(params);
```
