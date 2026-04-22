---
icon: hammer
---

# AutomationV2Unsub

### Description

Unsubscribe from old automation v2.

> **Notes**
>
> This action is deprecated.

### Action ID

`0x6195d72e`

### SDK Action

```ts
const automationV2UnsubAction = new dfs.actions.basic.AutomationV2Unsub(
    protocol,
    cdpId
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param cdpId ID of the cdp to unsubscribe from
    /// @param protocol Protocol to unsubscribe from (MCD, COMPOUND, AAVE)
    struct Params {
        uint256 cdpId;
        Protocols protocol;
    }
```

### Return Value

```solidity
return bytes32(0);
```

### Events and Logs

```solidity
emit ActionEvent("Unsubscribe", logData);
logger.logActionDirectEvent("Unsubscribe", logData);
bytes memory logData = abi.encode(params);
```
