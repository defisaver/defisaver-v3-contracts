---
icon: droplet
---

# LiquitySPDeposit

### Description

Action for depositing LUSD tokens to the stability pool

### Action ID

`0x78b3246a`

### SDK Action

```ts
const liquitySPDepositAction = new dfs.actions.liquity.LiquitySPDepositAction(
    lusdAmount,
    from,
    wethTo,
    lqtyTo
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param lusdAmount Amount of LUSD tokens to deposit
    /// @param from Address where to pull the tokens from
    /// @param wethTo Address that will receive ETH(wrapped) gains
    /// @param lqtyTo Address that will receive LQTY token gains
    struct Params {
        uint256 lusdAmount;
        address from;
        address wethTo;
        address lqtyTo;
    }
```

### Return Value

```solidity
return bytes32(depositedAmount);
```

### Events and Logs

```solidity
emit ActionEvent("LiquitySPDeposit", logData);
logger.logActionDirectEvent("LiquitySPDeposit", logData);
bytes memory logData = abi.encode(params);
```
