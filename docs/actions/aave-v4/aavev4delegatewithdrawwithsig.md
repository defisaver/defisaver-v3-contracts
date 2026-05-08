---
icon: ghost
---

# AaveV4DelegateWithdrawWithSig

### Description

Action that approves a spender to withdraw from the specified reserve using an EIP712-typed intent.


### Action ID
`0x9fd66aa7`

### SDK Action
````ts
const aaveV4DelegateWithdrawWithSigAction = new dfs.actions.aavev4.AaveV4DelegateWithdrawWithSigAction(
    permit,
    signature
);
````

### Action Type
`STANDARD_ACTION`

### Input Parameters
```solidity
    /// @notice Structured parameters for withdraw permit intent.
    /// @param spoke The address of the spoke.
    /// @param reserveId The identifier of the reserve.
    /// @param owner The address of the owner.
    /// @param spender The address of the spender.
    /// @param amount The amount of allowance.
    /// @param nonce The key-prefixed nonce for the signature.
    /// @param deadline The deadline for the intent.
    struct WithdrawPermit {
        address spoke;
        uint256 reserveId;
        address owner;
        address spender;
        uint256 amount;
        uint256 nonce;
        uint256 deadline;
    }
    
    /// @param permitData The structured WithdrawPermit parameters.
    /// @param signature The EIP712-compliant signature bytes.
    struct Params {
        ITakerPositionManager.WithdrawPermit permit;
        bytes signature;
    }
```

### Return Value
```solidity
return bytes32(amount);
```

### Events and Logs
```solidity
emit ActionEvent("AaveV4DelegateWithdrawWithSig", logData);
logger.logActionDirectEvent("AaveV4DelegateWithdrawWithSig", logData);
bytes memory logData = abi.encode(params);
```
