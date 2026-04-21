---
description: Withdraws backing lusd from a pending bond
icon: drumstick
---

# CBChickenOut

### Description

When the bond is in the pending stage, user can chicken out and withdraw the whole LUSD amount in the bond, forfeiting the interest earned on the LUSD. In some specific cases (bad liquidations, hacks...) the whole amount of LUSD might not be able to be returned so there is a minLUSD parameter as well.

Action calls [`chickenBondManager.chickenOut(uint256 _bondID, uint256 _minLUSD);`](https://github.com/liquity/ChickenBond/blob/3e20aa2672ed4cc15e47a2b154f1c5a9f3597908/LUSDChickenBonds/src/ChickenBondManager.sol#L309)

> **Notes**
>
> If the user can withdraw full lusdAmount, set minLUSD == bond.lusdAmount to be gas optimal

### Action ID

`0x6b376b60`

### SDK Action

```ts
const cBChickenOutAction = new dfs.actions.chickenBonds.CBChickenOutAction(
    bondId,
    minLUSD,
    to
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param bondID NFT token id of the bond
    /// @param minLUSD Minimum amount of LUSD to be returned if the full amount is not avail.
    /// @param to Address where to send LUSD returned
    struct Params {
        uint256 bondID;
        uint256 minLUSD;
        address to;
    }
```

### Return Value

```solidity
return bytes32(lusdAmount);
```

### Events and Logs

```solidity
emit ActionEvent("CBChickenOut", logData);
logger.logActionDirectEvent("CBChickenOut", logData);
bytes memory logData = abi.encode(params);
```
