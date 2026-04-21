---
icon: droplet
---

# LiquityUnstake

### Description

Action for unstaking LQTY tokens in Liquity

### Action ID

`0xcc148c8b`

### SDK Action

```ts
const liquityUnstakeAction = new dfs.actions.liquity.LiquityUnstakeAction(
    lqtyAmount,
    to,
    wethTo,
    lusdTo
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param lqtyAmount Amount of LQTY tokens to unstake
    /// @param to Address that will receive the tokens
    /// @param wethTo Address that will receive ETH(wrapped) gains
    /// @param lusdTo Address that will receive LUSD token gains
    struct Params {
        uint256 lqtyAmount;
        address to;
        address wethTo;
        address lusdTo;
    }
```

### Return Value

```solidity
return bytes32(unstakedAmount);
```

### Events and Logs

```solidity
emit ActionEvent("LiquityUnstake", logData);
logger.logActionDirectEvent("LiquityUnstake", logData);
bytes memory logData = abi.encode(params);
```
