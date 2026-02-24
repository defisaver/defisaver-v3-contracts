// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

interface IConfigPositionManager {
    /// @notice Sets the using as collateral status on behalf of a user for a specified reserve.
    /// @dev The `msg.sender` must have the permission to perform this action on behalf of the user.
    /// @param spoke The address of the spoke.
    /// @param reserveId The id of the reserve.
    /// @param usingAsCollateral The new using as collateral status.
    /// @param onBehalfOf The address of the user.
    function setUsingAsCollateralOnBehalfOf(
        address spoke,
        uint256 reserveId,
        bool usingAsCollateral,
        address onBehalfOf
    ) external;
}
