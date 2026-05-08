---
icon: reflect-horizontal
---

# ReflexerGenerate

### Description

**Action ID:** 0x95948e5d

Generate rai from a Reflexer Safe

### SDK Action

```
    const reflexerGenerateAction = new dfs.actions.reflexer.ReflexerGenerateAction(
        safeId,
        amount,
        to,
    );
```

### Contract

This is a DFS **STANDARD\_ACTION**.

**Input:**

```
    /// @param safeId Id of the safe
    /// @param amount Amount of rai to be generated
    /// @param to Address which will receive the rai
    struct Params {
        uint256 safeId;
        uint256 amount;
        address to;
    }
```

**Return value:**

```
return bytes32(borrowedAmount);
```

**Events:**

```
emit ActionEvent("ReflexerGenerate", logData);

logger.logActionDirectEvent("ReflexerGenerate", logData);

bytes memory logData = abi.encode(_safeId, _amount, _to)
```
