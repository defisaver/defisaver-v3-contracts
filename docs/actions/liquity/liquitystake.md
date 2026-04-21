---
icon: droplet
---

# LiquityStake

### Description

Action for staking LQTY tokens in Liquity

### Action ID

`0x3b37d730`

### SDK Action

```ts
const liquityStakeAction = new dfs.actions.liquity.LiquityStakeAction(
    lqtyAmount,
    from,
    wethTo,
    lusdTo
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param lqtyAmount Amount of LQTY tokens to stake
    /// @param from Address where to pull the tokens from
    /// @param wethTo Address that will receive ETH(wrapped) gains
    /// @param lusdTo Address that will receive LUSD token gains
    struct Params {
        uint256 lqtyAmount;
        address from;
        address wethTo;
        address lusdTo;
    }
```

### Return Value

```solidity
return bytes32(stakedAmount);
```

### Events and Logs

```solidity
emit ActionEvent("LiquityStake", logData);
logger.logActionDirectEvent("LiquityStake", logData);
bytes memory logData = abi.encode(params);
```
