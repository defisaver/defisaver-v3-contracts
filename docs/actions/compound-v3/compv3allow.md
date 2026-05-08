---
icon: building-columns
---

# CompV3Allow

### Description

Allow or disallow manager for Compound V3. Manager will be able to perform actions on behalf of the user.

### Action ID

`0xf2bccef8`

### SDK Action

```ts
const compoundV3AllowAction = new dfs.actions.compoundV3.CompoundV3AllowAction(
    market,
    manager,
    isAllowed
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param market Main Comet proxy contract that is different for each compound market
    /// @param manager Address of the manager
    /// @param isAllowed True for allow, false for disallow
    struct Params {
        address market;
        address manager;
        bool isAllowed;
    }
```

### Return Value

```solidity
return bytes32(uint256(isAllowed ? 1 : 0));
```

### Events and Logs

```solidity
emit ActionEvent("CompV3Allow", logData);
logger.logActionDirectEvent("CompV3Allow", logData);
bytes memory logData = abi.encode(params);
```
