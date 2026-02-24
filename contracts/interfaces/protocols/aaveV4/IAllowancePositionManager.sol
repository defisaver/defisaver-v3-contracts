// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

interface IAllowancePositionManager {
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
}
