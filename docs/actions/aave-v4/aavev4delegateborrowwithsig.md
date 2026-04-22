---
icon: ghost
---


# AaveV4DelegateBorrowWithSig

## Description

Action that approves a spender to borrow from the specified reserve using an EIP712-typed intent.

## Action ID
`0xf2047db2`

## SDK Action
````ts
const aaveV4DelegateBorrowWithSigAction = new dfs.actions.aavev4.AaveV4DelegateBorrowWithSigAction(
    permit,
    signature
);
````

## Action Type
`STANDARD_ACTION`

## Input Parameters
```solidity
    /// @notice Structured parameters for borrow permit intent.
    /// @param spoke The address of the spoke.
    /// @param reserveId The identifier of the reserve.
    /// @param owner The address of the owner.
    /// @param spender The address of the spender.
    /// @param amount The amount of allowance.
    /// @param nonce The key-prefixed nonce for the signature.
    /// @param deadline The deadline for the intent.
    struct BorrowPermit {
        address spoke;
        uint256 reserveId;
        address owner;
        address spender;
        uint256 amount;
        uint256 nonce;
        uint256 deadline;
    }

    /// @param permitData The structured BorrowPermit parameters.
    /// @param signature The EIP712-compliant signature bytes.
    struct Params {
        ITakerPositionManager.BorrowPermit permit;
        bytes signature;
    }
```

## Return Value
```solidity
return bytes32(amount);
```

## Events and Logs
```solidity
emit ActionEvent("AaveV4DelegateBorrowWithSig", logData);
logger.logActionDirectEvent("AaveV4DelegateBorrowWithSig", logData);
bytes memory logData = abi.encode(params);
```
