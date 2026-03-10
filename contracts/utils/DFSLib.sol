// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

/// @title DFSLib
/// @notice Provides utility functions for DFS actions.
library DFSLib {
    /// @notice Converts an unsigned 256-bit integer to a signed 256-bit integer.
    /// @dev Reverts if the input value exceeds the maximum value of int256.
    /// @param x The unsigned integer to convert.
    /// @return The signed integer representation of `x`.
    function signed256(uint256 x) internal pure returns (int256) {
        require(x <= uint256(type(int256).max));
        return int256(x);
    }

    /// @notice Converts a boolean to a bytes1.
    /// @param x The boolean to convert.
    /// @return r The bytes1 representation of `x`.
    function boolToBytes(bool x) internal pure returns (bytes1 r) {
        return x ? bytes1(0x01) : bytes1(0x00);
    }

    /// @notice Converts a bytes1 to a boolean.
    /// @param x The bytes1 to convert.
    /// @return r The boolean representation of `x`.
    function bytesToBool(bytes1 x) internal pure returns (bool r) {
        return x != bytes1(0x00);
    }
}
