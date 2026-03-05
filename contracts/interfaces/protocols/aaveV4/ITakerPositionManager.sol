// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

interface ITakerPositionManager {
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

    /// @notice Executes a supply on behalf of a user.
    /// @notice Approves a spender to withdraw assets from the specified reserve.
    /// @dev Using `type(uint256).max` as the amount results in an infinite approval, so the allowance is never decreased.
    /// @param spoke The address of the spoke.
    /// @param reserveId The identifier of the reserve.
    /// @param spender The address of the spender to receive the allowance.
    /// @param amount The amount of allowance.
    function approveWithdraw(address spoke, uint256 reserveId, address spender, uint256 amount)
        external;

    /// @notice Approves a borrow allowance for a spender.
    /// @dev Using `type(uint256).max` as the amount results in an infinite approval, so the allowance is never decreased.
    /// @param spoke The address of the spoke.
    /// @param reserveId The identifier of the reserve.
    /// @param spender The address of the spender to receive the allowance.
    /// @param amount The amount of allowance.
    function approveBorrow(address spoke, uint256 reserveId, address spender, uint256 amount)
        external;

    /// @notice Executes a withdraw on behalf of a user.
    /// @dev The caller must have sufficient withdraw allowance from onBehalfOf.
    /// @dev The caller receives the withdrawn assets.
    /// @param spoke The address of the spoke.
    /// @param reserveId The identifier of the reserve.
    /// @param amount The amount to withdraw.
    /// @param onBehalfOf The address of the user to withdraw on behalf of.
    /// @return The amount of shares withdrawn.
    /// @return The amount of assets withdrawn.
    function withdrawOnBehalfOf(
        address spoke,
        uint256 reserveId,
        uint256 amount,
        address onBehalfOf
    ) external returns (uint256, uint256);

    /// @notice Executes a borrow on behalf of a user.
    /// @dev The caller must have sufficient borrow allowance from onBehalfOf.
    /// @dev The caller receives the borrowed assets.
    /// @param spoke The address of the spoke.
    /// @param reserveId The identifier of the reserve.
    /// @param amount The amount to borrow.
    /// @param onBehalfOf The address of the user to borrow on behalf of.
    /// @return The amount of shares borrowed.
    /// @return The amount of assets borrowed.
    function borrowOnBehalfOf(address spoke, uint256 reserveId, uint256 amount, address onBehalfOf)
        external
        returns (uint256, uint256);

    /// @notice Returns the withdraw allowance for a spender on behalf of an owner.
    /// @param spoke The address of the spoke.
    /// @param reserveId The identifier of the reserve.
    /// @param owner The address of the owner.
    /// @param spender The address of the spender.
    /// @return The amount of withdraw allowance.
    function withdrawAllowance(address spoke, uint256 reserveId, address owner, address spender)
        external
        view
        returns (uint256);

    /// @notice Returns the credit delegation allowance for a spender on behalf of an owner.
    /// @param spoke The address of the spoke.
    /// @param reserveId The identifier of the reserve.
    /// @param owner The address of the owner.
    /// @param spender The address of the spender.
    /// @return The amount of credit delegation allowance.
    function borrowAllowance(address spoke, uint256 reserveId, address owner, address spender)
        external
        view
        returns (uint256);

    /// @notice Approves a spender to borrow from the specified reserve using an EIP712-typed intent.
    /// @dev Uses keyed-nonces where for each key's namespace nonce is consumed sequentially.
    /// @dev Using `type(uint256).max` as the amount results in an infinite approval, so the allowance is never decreased.
    /// @param params The structured BorrowPermit parameters.
    /// @param signature The EIP712-compliant signature bytes.
    function approveBorrowWithSig(BorrowPermit calldata params, bytes calldata signature) external;

    /// @notice Approves a spender to withdraw from the specified reserve using an EIP712-typed intent.
    /// @dev Uses keyed-nonces where for each key's namespace nonce is consumed sequentially.
    /// @dev Using `type(uint256).max` as the amount results in an infinite approval, so the allowance is never decreased.
    /// @param params The structured WithdrawPermit parameters.
    /// @param signature The EIP712-compliant signature bytes.
    function approveWithdrawWithSig(WithdrawPermit calldata params, bytes calldata signature)
        external;

    function DOMAIN_SEPARATOR() external view returns (bytes32);

    function nonces(address owner, uint192 key) external view returns (uint256 keyNonce);
}
