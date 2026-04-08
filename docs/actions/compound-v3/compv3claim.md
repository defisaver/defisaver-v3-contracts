---
icon: building-columns
---

# CompV3Claim

### Description

Claims Comp reward for the specified user.

> **Notes**
>
> Claim rewards of token type from a comet instance to a target address.

### Action ID

`0xf8470345`

### SDK Action

```ts
const compoundV3ClaimAction = new dfs.actions.compoundV3.CompoundV3ClaimAction(
    market,
    onBehalfOf,
    to,
    shouldAccrue
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param market Main Comet proxy contract that is different for each compound market
    /// @param onBehalf The owner to claim for, defaults to user's wallet
    /// @param to The address to receive the rewards
    /// @param shouldAccrue If true, the protocol will account for the rewards owed to the account as of the current block before transferring
    struct Params {
        address market;
        address onBehalf;
        address to;
        bool shouldAccrue;
    }
```

### Return Value

```solidity
return bytes32(compClaimed);
```

### Events and Logs

```solidity
emit ActionEvent("CompV3Claim", logData);
logger.logActionDirectEvent("CompV3Claim", logData);
bytes memory logData = abi.encode(params);
```
