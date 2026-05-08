---
icon: droplet
---

# LiquityEthGainToTrove

### Description

Action for withdrawing ETH gains to Trove

### Action ID

`0x8a2f814a`

### SDK Action

```ts
const liquityEthGainToTroveAction = new dfs.actions.liquity.LiquityEthGainToTroveAction(
    lqtyTo,
    upperHint,
    lowerHint
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param lqtyTo Address that will receive LQTY token gains
    /// @param upperHint Upper hint for finding a Trove in linked list
    /// @param lowerHint Lower hint for finding a Trove in linked list
    struct Params {
        address lqtyTo;
        address upperHint;
        address lowerHint;
    }
```

### Return Value

```solidity
return bytes32(ethGain);
```

### Events and Logs

```solidity
emit ActionEvent("LiquityEthGainToTrove", logData);
logger.logActionDirectEvent("LiquityEthGainToTrove", logData);
bytes memory logData = abi.encode(params);
```
