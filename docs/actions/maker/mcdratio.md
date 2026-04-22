---
icon: m
---

# McdRatio

### Description

**Action ID:** 0xdc5d6943

Returns a ratio for mcd vault

### SDK Action

```
const mcdRatioAction = new dfs.actions.maker.MakerRatioAction(
        vaultId,
    );
```

### Contract

This is a DFS **STANDARD\_ACTION**.

**Input:**

```
    /// @param vaultId Id of the vault
    struct Params {
        uint256 vaultId;
    }
```

**Return value:**

```
return bytes32(ratio);
```

**Events:**

```
```
