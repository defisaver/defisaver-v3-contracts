---
icon: hammer
---

# TokenizedVaultAdapter

### Description

No description available

> **Notes**
>
> Action that handles ERC4626 vault operations

### Action ID

`0x3e46d5ba`

### SDK Actions

All actions are mapped to the same contract.

```ts
const tokenizedVaultAdapterDepositAction = new dfs.actions.basic.TokenizedVaultAdapterDepositAction(
    amount,
    minOut,
    vaultAddress,
    from,
    to,
    underlyingAssetAddress
);

const tokenizedVaultAdapterMintAction = new dfs.actions.basic.TokenizedVaultAdapterMintAction(
    amount,
    maxIn,
    vaultAddress,
    from,
    to,
    underlyingAssetAddress
);

const tokenizedVaultAdapterRedeemAction = new dfs.actions.basic.TokenizedVaultAdapterRedeemAction(
    amount,
    minOut,
    vaultAddress,
    from,
    to
);

const tokenizedVaultAdapterWithdrawAction = new dfs.actions.basic.TokenizedVaultAdapterWithdrawAction(
    amount,
    maxIn,
    vaultAddress,
    from,
    to
);

```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param amount - For DEPOSIT and REDEEM represents exact input token amount, otherwise represents exact output
    /// @param minOutOrMaxIn - For DEPOSIT and REDEEM represents min output token amount, otherwise represents max input
    /// @param vaultAddress - Address of the ERC4626 vault
    /// @param from - Address from which to pull the input token
    /// @param to - Asset that will receive the output token
    /// @param operationId - Enum id that represents the selected operation (DEPOSIT, MINT, WITHDRAW, REDEEM)
    struct Params {
        uint256 amount;
        uint256 minOutOrMaxIn;
        address vaultAddress;
        address from;
        address to;
        OperationId operationId;
    }
```

### Return Value

```solidity
return bytes32(returnAmount);
```

### Events and Logs

```solidity
emit ActionEvent("TokenizedVaultAdapter", logData);
logger.logActionDirectEvent("TokenizedVaultAdapter", logData);
bytes memory logData = abi.encode(params);
```
