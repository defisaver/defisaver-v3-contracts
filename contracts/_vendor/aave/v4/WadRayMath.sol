// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

/// @title WadRayMath library
/// @author Aave Labs
/// @notice Provides utility functions to work with WAD and RAY units with explicit rounding.
///
/// @dev Taken and adapted from Aave. Changes:
/// - Remove all function and only use 'rayMulUp' and 'fromRayUp'.
library WadRayMath {
    uint256 internal constant RAY = 1e27;

    /// @notice Multiplies two RAY numbers, rounding up.
    /// @dev Reverts if intermediate multiplication overflows.
    /// @return c = ceil(a * b / RAY), expressed in RAY.
    function rayMulUp(uint256 a, uint256 b) internal pure returns (uint256 c) {
        assembly ("memory-safe") {
            // to avoid overflow, a <= type(uint256).max / b
            if iszero(or(iszero(b), iszero(gt(a, div(not(0), b))))) {
                revert(0, 0)
            }
            c := mul(a, b)
            // Add 1 if (a * b) % RAY > 0 to round up the division of (a * b) by RAY
            c := add(div(c, RAY), gt(mod(c, RAY), 0))
        }
    }

    /// @notice Removes RAY precision from a given value, rounding up.
    /// @return b = ceil(a / RAY).
    function fromRayUp(uint256 a) internal pure returns (uint256 b) {
        assembly ("memory-safe") {
            // add 1 if (a % RAY) > 0 to round up the division of a by RAY
            b := add(div(a, RAY), gt(mod(a, RAY), 0))
        }
    }
}
