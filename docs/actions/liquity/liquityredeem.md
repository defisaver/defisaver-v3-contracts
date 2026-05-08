---
icon: droplet
---

# LiquityRedeem

### Description

Action for redeeming Trove in Liquity

> **Notes**
>
> Redeems ETH(wrapped) using LUSD with the target price of LUSD = 1$

### Action ID

`0xd89acd5c`

### SDK Action

```ts
const liquityRedeemAction = new dfs.actions.liquity.LiquityRedeemAction(
    lusdAmount,
    from,
    to,
    firstRedemptionHint,
    upperPartialRedemptionHint,
    lowerPartialRedemptionHint,
    partialRedemptionHintNICR,
    maxIterations,
    maxFeePercentage
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param lusdAmount Amount of LUSD tokens to redeem
    /// @param from Address where to pull the tokens from
    /// @param to Address that will receive the tokens
    /// @param firstRedemptionHint First hint for finding a redemption
    /// @param upperPartialRedemptionHint Upper hint for finding a redemption
    /// @param lowerPartialRedemptionHint Lower hint for finding a redemption
    /// @param partialRedemptionHintNICR Partial redemption hint NICR
    /// @param maxIterations Maximum number of iterations
    /// @param maxFeePercentage Maximum fee percentage
    struct Params {
        uint256 lusdAmount;
        address from;
        address to;
        address firstRedemptionHint;
        address upperPartialRedemptionHint;
        address lowerPartialRedemptionHint;
        uint256 partialRedemptionHintNICR;
        uint256 maxIterations;
        uint256 maxFeePercentage;
    }
```

### Return Value

```solidity
return bytes32(ethRedeemed);
```

### Events and Logs

```solidity
emit ActionEvent("LiquityRedeem", logData);
logger.logActionDirectEvent("LiquityRedeem", logData);
bytes memory logData = abi.encode(params);
```
