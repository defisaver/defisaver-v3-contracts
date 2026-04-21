---
icon: hammer
---

# GasFeeTaker

### Description

Helper action to take gas fee from the user's wallet and send it to the fee recipient.

> **Notes**
>
> If divider is lower the fee is greater, should be max 5 bps

### Action ID

`0x4571b8b3`

### SDK Action

```ts
const gasFeeTakerAction = new dfs.actions.basic.GasFeeAction(
    gasStart,
    feeToken,
    availableAmount,
    dfsFeeDivider
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
    struct GasFeeTakerParams {
        uint256 gasUsed;
        address feeToken;
        uint256 availableAmount;
        uint256 dfsFeeDivider;
    }
```

### Return Value

```solidity
return bytes32(amountLeft);
```

### Events and Logs

```solidity
```
