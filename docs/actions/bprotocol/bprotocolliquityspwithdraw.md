---
icon: b
---

# BprotocolLiquitySPWithdraw

### Description

BprotocolLiquitySPWithdraw - Action that withdraws LUSD from Bprotocol

### Action ID

`0xe1434471`

### SDK Action

```ts
const bprotocolLiquitySPWithdrawAction = new dfs.actions.bprotocol.BprotocolLiquitySPWithdrawAction(
    shareAmount,
    to,
    lqtyTo
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param shareAmount Amount of shares to burn
    /// @param to Address that will recieve the LUSD and WETH withdrawn
    /// @param lqtyTo Address that will recieve LQTY rewards
    struct Params {
        uint256 shareAmount;
        address to;
        address lqtyTo;
    }
```

### Return Value

```solidity
return bytes32(lusdWithdrawn);
```

### Events and Logs

```solidity
emit ActionEvent("BprotocolLiquitySPWithdraw", logData);
logger.logActionDirectEvent("BprotocolLiquitySPWithdraw", logData);
bytes memory logData = abi.encode(params);
```
