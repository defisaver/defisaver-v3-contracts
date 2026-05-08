---
icon: drumstick
---

# FetchBondId

### Description

Special action to fetch BondId for the Liquity payback from CB strategy and to deactivate rebond strategy if bond from rebond strat was used

> **Notes**
>
> \_params.cbRebondBondId is sent externally so we can hash the sub object and compare it with what's stored in onchain storage. If sourceType is SUB, we deactivate the rebond strategy.

### Action ID

`0x60481c98`

### SDK Action

```ts
const fetchBondIdAction = new dfs.actions.chickenBonds.FetchBondIdAction(
    paybackSourceId,
    sourceType,
    cbRebondBondId
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param paybackSourceId Id of the payback source, can be either bondId or rebond strat subId
    /// @param sourceType if paybackSourceId refers to a bondId or subId
    /// @param cbRebondBondId Id of the current bond in the Rebond sub (only used if sourceType is SUB, otherwise 0)
    struct Params {
        uint256 paybackSourceId;
        uint256 sourceType;
        uint256 cbRebondBondId;
    }
```

### Return Value

```solidity
```

### Events and Logs

```solidity
```
