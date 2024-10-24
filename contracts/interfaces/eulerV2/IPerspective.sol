// SPDX-License-Identifier: GPL-2.0-or-later

pragma solidity =0.8.24;

/// @title IPerspective
/// @custom:security-contact security@euler.xyz
/// @author Euler Labs (https://www.eulerlabs.com/)
/// @notice A contract that verifies the properties of a vault.
interface IPerspective {
    /// @notice Emitted when a vault is verified successfully.
    /// @param vault The address of the vault that has been verified.
    event PerspectiveVerified(address indexed vault);

    /// @notice Error thrown when a perspective verification fails.
    /// @param perspective The address of the perspective contract where the error occurred.
    /// @param vault The address of the vault being verified.
    /// @param codes The error codes indicating the reasons for verification failure.
    error PerspectiveError(address perspective, address vault, uint256 codes);

    /// @notice Error thrown when a panic occurs in the perspective contract.
    error PerspectivePanic();

    /// @notice Returns the name of the perspective.
    /// @dev Name should be unique and descriptive.
    /// @return The name of the perspective.
    function name() external view returns (string memory);

    /// @notice Verifies the properties of a vault.
    /// @param vault The address of the vault to verify.
    /// @param failEarly Determines whether to fail early on the first error encountered or allow the verification to
    /// continue and report all errors.
    function perspectiveVerify(address vault, bool failEarly) external;

    /// @notice Checks if a vault is verified.
    /// @param vault The address of the vault to check.
    /// @return True if the vault is verified, false otherwise.
    function isVerified(address vault) external view returns (bool);

    /// @notice Returns the number of verified vaults.
    /// @return The number of verified vaults.
    function verifiedLength() external view returns (uint256);

    /// @notice Returns an array of all verified vault addresses.
    /// @return An array of addresses of verified vaults.
    function verifiedArray() external view returns (address[] memory);
}
