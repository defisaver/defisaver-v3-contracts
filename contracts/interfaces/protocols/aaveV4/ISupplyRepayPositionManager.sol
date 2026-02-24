// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

interface ISupplyRepayPositionManager {
    /// @notice Executes a supply on behalf of a user.
    /// @param spoke The address of the spoke.
    /// @param reserveId The identifier of the reserve.
    /// @param amount The amount to supply.
    /// @param onBehalfOf The address of the user to supply on behalf of.
    /// @return The amount of shares supplied.
    /// @return The amount of assets supplied.
    function supplyOnBehalfOf(address spoke, uint256 reserveId, uint256 amount, address onBehalfOf)
        external
        returns (uint256, uint256);

    /// @notice Executes a repay on behalf of a user.
    /// @dev If the amount exceeds the user's current debt, the entire debt is repaid.
    /// @dev Using `type(uint256).max` to repay the full debt is not allowed with this method.
    /// @param spoke The address of the spoke.
    /// @param reserveId The identifier of the reserve.
    /// @param amount The amount to repay.
    /// @param onBehalfOf The address of the user to repay on behalf of.
    /// @return The amount of shares repaid.
    /// @return The amount of assets repaid.
    function repayOnBehalfOf(address spoke, uint256 reserveId, uint256 amount, address onBehalfOf)
        external
        returns (uint256, uint256);
}
