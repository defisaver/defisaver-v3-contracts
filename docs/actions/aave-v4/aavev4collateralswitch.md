---
icon: ghost
---


# AaveV4CollateralSwitch

## Description

Switch action if user wants to use tokens for collateral on aaveV4 spoke.


## Action ID
`0xba79ba14`

## SDK Action
````ts
const aaveV4CollateralSwitchAction = new dfs.actions.aavev4.AaveV4CollateralSwitchAction(
    spoke,
    onBehalf,
    reserveId,
    useAsCollateral
);
````

## Action Type
`STANDARD_ACTION`

## Input Parameters
```solidity
    /// @param spoke Address of the spoke.
    /// @param onBehalf Address to switch collateral on behalf of. Defaults to the user's wallet if not provided.
    /// @param reserveId Reserve id.
    /// @param useAsCollateral Whether to use the tokens as collateral.
    struct Params {
        address spoke;
        address onBehalf;
        uint256 reserveId;
        bool useAsCollateral;
    }
```

## Return Value
```solidity
return bytes32(0);
```

## Events and Logs
```solidity
emit ActionEvent("AaveV4CollateralSwitch", logData);
logger.logActionDirectEvent("AaveV4CollateralSwitch", logData);
bytes memory logData = abi.encode(params);
```
