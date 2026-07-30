// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

/**
 * @title PercentageMath library
 * @author Aave
 * @dev Taken adapted from Aave. Changes:
 * - Removed all functions except percentMulFloor
 */
library PercentageMath {
    // Maximum percentage factor (100.00%)
    uint256 internal constant PERCENTAGE_FACTOR = 1e4;

    function percentMulFloor(uint256 value, uint256 percentage)
        internal
        pure
        returns (uint256 result)
    {
        // to avoid overflow, value <= type(uint256).max / percentage
        assembly {
            if iszero(or(iszero(percentage), iszero(gt(value, div(not(0), percentage))))) {
                revert(0, 0)
            }

            result := div(mul(value, percentage), PERCENTAGE_FACTOR)
        }
    }
}
