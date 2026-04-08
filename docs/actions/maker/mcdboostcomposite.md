---
icon: m
---

# McdBoostComposite

### Description

Single mcd boost action can use flashloan or not

> **Notes**
>
> Executes boost logic

### Action ID

`0x310b34c6`

### SDK Action

```ts
const makerBoostCompositeAction = new dfs.actions.maker.MakerBoostCompositeAction(
    vaultId,
    joinAddr,
    gasUsed,
    flAddress,
    flAmount,
    nextPrice,
    targetRatio,
    exchangeParams
);
```

### Action Type

`CUSTOM_ACTION`

### Input Parameters

```solidity
/// @param vaultId Id of the vault
/// @param joinAddr Collateral join address
/// @param gasUsed Gas amount to charge in strategies
/// @param flAddr Flashloan address 0x0 if we're not using flashloan
/// @param flAmount Amount that the flashloan actions returns if used (must have it because of fee)
/// @param nextPrice Maker OSM next price if 0 we're using current price (used for ratio check)
/// @param targetRatio Target ratio to repay if 0 we are not checking the ratio
/// @param exchangeData Data needed for swap
struct BoostParams {
    uint256 vaultId;
    address joinAddr;
    uint256 gasUsed;
    address flAddr;
    uint256 flAmount;
    uint256 nextPrice;
    uint256 targetRatio;
    ExchangeData exchangeData;
}
```

### Return Value

```solidity
return bytes32(suppliedAmount);
```

### Events and Logs

```solidity
emit ActionEvent("McdBoostComposite", logData);
logger.logActionDirectEvent("McdBoostComposite", logData);
bytes memory logData = abi.encode(params);
```
