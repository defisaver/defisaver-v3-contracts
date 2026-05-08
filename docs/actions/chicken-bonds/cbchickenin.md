---
icon: drumstick
---

# CBChickenIn

### Description

Chickens in a bond and gets back bLUSD.

### Action ID

`0x56185a2d`

### SDK Action

```ts
const cBChickenInAction = new dfs.actions.chickenBonds.CBChickenInAction(
    bondId,
    to
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param bondID NFT token id of the bond
    /// @param to Address where to send bLUSD returned
    struct Params {
        uint256 bondID;
        address to;
    }
```

### Return Value

```solidity
return bytes32(bLusdAmountReceived);
```

### Events and Logs

```solidity
emit ActionEvent("CBChickenIn", logData);
logger.logActionDirectEvent("CBChickenIn", logData);
bytes memory logData = abi.encode(params);
```
