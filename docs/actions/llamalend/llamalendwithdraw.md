---
icon: rainbow
---

# LlamaLendWithdraw

### Description

Action that withdraws collateral from user's wallet llamalend position

### Action ID

`0xf54e28d9`

### SDK Action

```ts
const llamaLendWithdrawAction = new dfs.actions.llamalend.LlamaLendWithdrawAction(
    controllerAddress,
    to,
    collateralAmount
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param controllerAddress Address of the llamalend market controller
    /// @param to Address that will receive the withdrawn collateral
    /// @param collateralAmount Amount of collateral to withdraw
    struct Params {
        address controllerAddress;
        address to;
        uint256 collateralAmount;
    }
```

### Return Value

```solidity
return bytes32(generatedAmount);
```

### Events and Logs

```solidity
emit ActionEvent("LlamaLendWithdraw", logData);
logger.logActionDirectEvent("LlamaLendWithdraw", logData);
bytes memory logData = abi.encode(params);
```
