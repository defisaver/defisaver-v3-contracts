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

    /// @notice Structured parameters for using as collateral permission permit intent.
    /// @dev spoke The address of the Spoke.
    /// @dev delegator The address of the delegator.
    /// @dev delegatee The address of the delegatee.
    /// @dev permission The new permission status.
    /// @dev nonce The key-prefixed nonce for the signature.
    /// @dev deadline The deadline for the intent.
    struct SetCanSetUsingAsCollateralPermissionPermit {
        address spoke;
        address delegator;
        address delegatee;
        bool permission;
        uint256 nonce;
        uint256 deadline;
    }

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
    function setCanSetUsingAsCollateralPermission(
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

    /// @notice Updates the user risk premium on behalf of a user.
    /// @dev The `msg.sender` must be the delegatee to perform this action on behalf of the user.
    /// @dev Contract must be an active and approved user position manager of `onBehalfOf`.
    /// @param spoke The address of the spoke.
    /// @param onBehalfOf The address of the user.
    function updateUserRiskPremiumOnBehalfOf(address spoke, address onBehalfOf) external;

    /// @notice Updates the user dynamic config on behalf of a user.
    /// @dev The `msg.sender` must be the delegatee to perform this action on behalf of the user.
    /// @dev Contract must be an active and approved user position manager of `onBehalfOf`.
    /// @param spoke The address of the spoke.
    /// @param onBehalfOf The address of the user.
    function updateUserDynamicConfigOnBehalfOf(address spoke, address onBehalfOf) external;

    /// @notice Returns the config permissions for a delegatee on behalf of a user.
    /// @param spoke The address of the spoke.
    /// @param delegatee The address of the delegatee.
    /// @param onBehalfOf The address of the user.
    /// @return The ConfigPermissionValues for the delegatee on behalf of the user.
    function getConfigPermissions(address spoke, address delegatee, address onBehalfOf)
        external
        view
        returns (ConfigPermissionValues memory);

    /// @notice Sets the using as collateral permission for a delegatee using an EIP712-typed intent.
    /// @dev Uses keyed-nonces where for each key's namespace nonce is consumed sequentially.
    /// @param params The structured SetCanSetUsingAsCollateralPermissionPermit parameters.
    /// @param signature The EIP712-compliant signature bytes.
    function setCanSetUsingAsCollateralPermissionWithSig(
        SetCanSetUsingAsCollateralPermissionPermit calldata params,
        bytes calldata signature
    ) external;

    /// @notice Returns the EIP-712 domain separator.
    function DOMAIN_SEPARATOR() external view returns (bytes32);

    /// @notice Returns the type hash for the SetCanSetUsingAsCollateralPermissionPermit intent.
    function SET_CAN_SET_USING_AS_COLLATERAL_PERMISSION_PERMIT_TYPEHASH()
        external
        view
        returns (bytes32);

    /// @notice Returns the next unused nonce for an address and key. Result contains the key prefix.
    /// @param owner The address of the nonce owner.
    /// @param key The key which specifies namespace of the nonce.
    /// @return keyNonce The first 24 bytes are for the key, & the last 8 bytes for the nonce.
    function nonces(address owner, uint192 key) external view returns (uint256 keyNonce);

    function eip712Domain()
        external
        view
        returns (
            bytes1 fields,
            string memory name,
            string memory version,
            uint256 chainId,
            address verifyingContract,
            bytes32 salt,
            uint256[] memory extensions
        );
}
