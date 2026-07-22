// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

/// @dev Taken from: https://github.com/morpho-org/midnight
/// @dev Changes:
/// Removed all functions except for:
/// - zeroFloorSub
/// - `clearBit`
/// - `mulDivDown`
/// - `mulDivUp`
/// - `msb` -> implementation is changed to work with cancun and 0.8.24 compiler (can't use clz from Osaka)
library UtilsLib {
    function zeroFloorSub(uint256 x, uint256 y) internal pure returns (uint256 z) {
        assembly {
            z := mul(gt(x, y), sub(x, y))
        }
    }

    /// @dev Assumes bitmap is not zero.
    function msb(uint128 bitmap) internal pure returns (uint256 res) {
        assembly {
            bitmap := and(bitmap, 0xffffffffffffffffffffffffffffffff)
            res := shl(6, gt(bitmap, 0xffffffffffffffff))
            res := or(res, shl(5, gt(shr(res, bitmap), 0xffffffff)))
            res := or(res, shl(4, gt(shr(res, bitmap), 0xffff)))
            res := or(res, shl(3, gt(shr(res, bitmap), 0xff)))
            res := or(res, shl(2, gt(shr(res, bitmap), 0xf)))
            res := or(res, shl(1, gt(shr(res, bitmap), 0x3)))
            res := or(res, gt(shr(res, bitmap), 0x1))
        }
    }

    /// @dev Assumes bit is less than 128.
    function clearBit(uint128 bitmap, uint256 bit) internal pure returns (uint128) {
        // forge-lint: disable-next-item(unsafe-typecast)
        return uint128(bitmap & ~(1 << bit));
    }

    /// @dev Returns (x * y) / d rounded down.
    function mulDivDown(uint256 x, uint256 y, uint256 d) internal pure returns (uint256) {
        return (x * y) / d;
    }

    /// @dev Returns (x * y) / d rounded up.
    function mulDivUp(uint256 x, uint256 y, uint256 d) internal pure returns (uint256) {
        return (x * y + (d - 1)) / d;
    }
}
