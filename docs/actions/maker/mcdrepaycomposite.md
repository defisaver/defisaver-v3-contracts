---
icon: m
---

# McdRepayComposite

### Description

Single mcd repay action can use flashloan or not

### Action ID

`0xb732e076`

### SDK Action

```ts
const makerRepayCompositeAction = new dfs.actions.maker.MakerRepayCompositeAction(
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
/// @param flAddress Flashloan address 0x0 if we're not using flashloan
/// @param flAmount Amount that the flashloan actions returns if used (must have it because of fee)
/// @param nextPrice Maker OSM next price if 0 we're using current price (used for ratio check)
/// @param targetRatio Target ratio to repay if 0 we are not checking the ratio
/// @param exchangeData Data needed for swap
struct RepayParams {
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
return bytes32(paybackAmount);
```

### Events and Logs

```solidity
emit ActionEvent("McdRepayComposite", logData);
logger.logActionDirectEvent("McdRepayComposite", logData);
bytes memory logData = abi.encode(params);
```
