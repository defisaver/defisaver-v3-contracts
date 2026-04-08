---
icon: hammer
---

# GasFeeTakerL2

### Description

Helper action to take gas fee from the user's wallet on L2 and send it to the fee recipient.

> **Notes**
>
> If divider is lower the fee is greater, should be max 5 bps.

### Action ID

`0x7ec82077`

### SDK Action

```ts
const gasFeeTakerL2Action = new dfs.actions.basic.GasFeeActionL2(
    gasStart,
    feeToken,
    availableAmount,
    dfsFeeDivider,
    l1GasCostInEth
);
```

### Action Type

`FEE_ACTION`

### Input Parameters

```solidity
    /// @param gasUsed Gas used by the transaction
    /// @param feeToken Address of the token to send
    /// @param availableAmount Amount of tokens available to send
    /// @param dfsFeeDivider Divider for the DFS fee
    /// @param l1GasCostInEth Additional L1 gas cost in Eth
    struct Params {
        uint256 gasUsed;
        address feeToken;
        uint256 availableAmount;
        uint256 dfsFeeDivider;
        uint256 l1GasCostInEth;
    }
```

### Return Value

```solidity
return bytes32(amountLeft);
```

### Events and Logs

```solidity
```
