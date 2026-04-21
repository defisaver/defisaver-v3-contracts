---
icon: droplet
---

# LiquitySPWithdraw

### Description

Action for withdrawing LUSD tokens from the stability pool

### Action ID

`0x76a18aec`

### SDK Action

```ts
const liquitySPWithdrawAction = new dfs.actions.liquity.LiquitySPWithdrawAction(
    lusdAmount,
    to,
    wethTo,
    lqtyTo
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param lusdAmount Amount of LUSD tokens to withdraw
    /// @param to Address that will receive the tokens
    /// @param wethTo Address that will receive ETH(wrapped) gains
    /// @param lqtyTo Address that will receive LQTY token gains
    struct Params {
        uint256 lusdAmount;
        address to;
        address wethTo;
        address lqtyTo;
    }
```

### Return Value

```solidity
return bytes32(withdrawnAmount);
```

### Events and Logs

```solidity
emit ActionEvent("LiquitySPWithdraw", logData);
logger.logActionDirectEvent("LiquitySPWithdraw", logData);
bytes memory logData = abi.encode(params);
```
