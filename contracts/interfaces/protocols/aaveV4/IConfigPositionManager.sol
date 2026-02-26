// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

interface IConfigPositionManager {
    /// @notice Struct to hold the config permission values.
    /// @dev canSetUsingAsCollateral Whether the delegatee can set using as collateral on behalf of the user.
    /// @dev canUpdateUserRiskPremium Whether the delegatee can update user risk premium on behalf of the user.
    /// @dev canUpdateUserDynamicConfig Whether the delegatee can update user dynamic config on behalf of the user.
    struct ConfigPermissionValues {
        bool canSetUsingAsCollateral;
        bool canUpdateUserRiskPremium;
        bool canUpdateUserDynamicConfig;
    }

    /// @notice Sets the global permission for a delegatee.
    /// @param spoke The address of the spoke.
    /// @param delegatee The address of the delegatee.
    /// @param permission The new permission status.
    function setGlobalPermission(address spoke, address delegatee, bool permission) external;

    /// @notice Sets the user risk premium permission for a delegatee.
    /// @param spoke The address of the spoke.
    /// @param delegatee The address of the delegatee.
    /// @param permission The new permission status.
    function setCanUpdateUserRiskPremiumPermission(
        address spoke,
        address delegatee,
        bool permission
    ) external;

    /// @notice Sets the user dynamic config permission for a delegatee.
    /// @param spoke The address of the spoke.
    /// @param delegatee The address of the delegatee.
    /// @param permission The new permission status.
    function setCanUpdateUserDynamicConfigPermission(
        address spoke,
        address delegatee,
        bool permission
    ) external;

    /// @notice Sets the using as collateral permission for a delegatee.
    /// @param spoke The address of the spoke.
    /// @param delegatee The address of the delegatee.
    /// @param permission The new permission status.
    function setCanUpdateUsingAsCollateralPermission(
        address spoke,
        address delegatee,
        bool permission
    ) external;

    /// @notice Sets the using as collateral status on behalf of a user for a specified reserve.
    /// @dev The `msg.sender` must be the delegatee to perform this action on behalf of the user.
    /// @dev Contract must be an active and approved user position manager of `onBehalfOf`.
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

    /// @notice Returns the config permissions for a delegatee on behalf of a user.
    /// @param spoke The address of the spoke.
    /// @param delegatee The address of the delegatee.
    /// @param onBehalfOf The address of the user.
    /// @return The ConfigPermissionValues for the delegatee on behalf of the user.
    function getConfigPermissions(address spoke, address delegatee, address onBehalfOf)
        external
        view
        returns (ConfigPermissionValues memory);
}
