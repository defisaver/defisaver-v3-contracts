# RequiredAmountAndAllowanceTrigger

### Description

> **Notes**
>
> Checks if the user has enough balance and allowance of the token to trigger the strategy execution.

### Trigger ID

`0xbd30ff8e`

### SDK Action

```ts
None
```

### Subscription Parameters

```solidity
None
```

### Calldata Parameters

```solidity
/// @param user address of the Smart Wallet that has subscription
/// @param sellTokenAddr address of the token that is being sold. Will always be ERC20 token. For ether, it will be WETH.
/// @param desiredAmount amount that represents the triggerable point
struct CalldataParams {
    address user;
    address sellTokenAddr;
    uint256 desiredAmount;
}
```

### IsChangeable

`false`
