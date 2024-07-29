// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { SparkDataTypes } from "./SparkDataTypes.sol";

/**
 * @title IReserveInterestRateStrategy
 * @author Aave
 * @notice Interface for the calculation of the interest rates
 */
interface ISparkReserveInterestRateStrategy {
  /**
   * @notice Calculates the interest rates depending on the reserve's state and configurations
   * @param params The parameters needed to calculate interest rates
   * @return liquidityRate The liquidity rate expressed in rays
   * @return stableBorrowRate The stable borrow rate expressed in rays
   * @return variableBorrowRate The variable borrow rate expressed in rays
   */
  function calculateInterestRates(
    SparkDataTypes.CalculateInterestRatesParams memory params
  ) external view returns (uint256, uint256, uint256);
}
