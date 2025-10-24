// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

/**
 * @title ISparkStableDebtToken
 * @author Aave
 * @notice Defines the interface for the stable debt token
 * @dev It does not inherit from IERC20 to save in code size
 */
interface ISparkStableDebtToken {
    /**
     * @notice Returns the total supply and the average stable rate
     * @return The total supply
     * @return The average rate
     */
    function getTotalSupplyAndAvgRate() external view returns (uint256, uint256);
}
