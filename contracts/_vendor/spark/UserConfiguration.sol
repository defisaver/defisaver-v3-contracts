// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { SparkDataTypes } from "../../interfaces/protocols/spark/SparkDataTypes.sol";

/**
 * @title UserConfiguration library
 * @author Aave
 * @notice Implements the bitmap logic to handle the user configuration
 * @dev Taken and adapted from Aave. Changes:
 * - Removed all functions, except:
 *         - `isUsingAsCollateralOrBorrowing`,
 *         - `isBorrowing`,
 *         - `isUsingAsCollateral`, and
 *         - `isEmpty`
 * - Removed require statements from `isUsingAsCollateralOrBorrowing`, `isBorrowing`, and `isUsingAsCollateral`
 * - Renamed DataTypes to SparkDataTypes
 */
library UserConfiguration {
    /**
     * @notice Returns if a user has been using the reserve for borrowing or as collateral
     * @param self The configuration object
     * @param reserveIndex The index of the reserve in the bitmap
     * @return True if the user has been using a reserve for borrowing or as collateral, false otherwise
     */
    function isUsingAsCollateralOrBorrowing(
        SparkDataTypes.UserConfigurationMap memory self,
        uint256 reserveIndex
    ) internal pure returns (bool) {
        unchecked {
            return (self.data >> (reserveIndex << 1)) & 3 != 0;
        }
    }

    /**
     * @notice Validate a user has been using the reserve for borrowing
     * @param self The configuration object
     * @param reserveIndex The index of the reserve in the bitmap
     * @return True if the user has been using a reserve for borrowing, false otherwise
     */
    function isBorrowing(SparkDataTypes.UserConfigurationMap memory self, uint256 reserveIndex)
        internal
        pure
        returns (bool)
    {
        unchecked {
            return (self.data >> (reserveIndex << 1)) & 1 != 0;
        }
    }

    /**
     * @notice Validate a user has been using the reserve as collateral
     * @param self The configuration object
     * @param reserveIndex The index of the reserve in the bitmap
     * @return True if the user has been using a reserve as collateral, false otherwise
     */
    function isUsingAsCollateral(
        SparkDataTypes.UserConfigurationMap memory self,
        uint256 reserveIndex
    ) internal pure returns (bool) {
        unchecked {
            return (self.data >> ((reserveIndex << 1) + 1)) & 1 != 0;
        }
    }

    /**
     * @notice Checks if a user has not been using any reserve for borrowing or supply
     * @param self The configuration object
     * @return True if the user has not been borrowing or supplying any reserve, false otherwise
     */
    function isEmpty(SparkDataTypes.UserConfigurationMap memory self) internal pure returns (bool) {
        return self.data == 0;
    }
}
