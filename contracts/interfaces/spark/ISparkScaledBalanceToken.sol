// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

/**
 * @title ISparkScaledBalanceToken
 * @author Aave
 * @notice Defines the basic interface for a scaled-balance token.
 */
interface ISparkScaledBalanceToken {
    /**
     * @notice Returns the scaled total supply of the scaled balance token. Represents sum(debt/index)
     * @return The scaled total supply
     */
    function scaledTotalSupply() external view returns (uint256);
}
