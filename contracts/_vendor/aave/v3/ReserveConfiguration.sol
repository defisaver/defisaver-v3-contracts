// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { DataTypes } from "../../../interfaces/protocols/aaveV3/DataTypes.sol";

/**
 * @title ReserveConfiguration library
 * @author Aave
 * @notice Implements the bitmap logic to handle the reserve configuration
 * @dev Taken and adapted from Aave. Changes:
 * - Removed set functions
 * - Removed MAX constants
 */
library ReserveConfiguration {
    uint256 internal constant LTV_MASK =
        0x000000000000000000000000000000000000000000000000000000000000FFFF; // prettier-ignore
    uint256 internal constant LIQUIDATION_THRESHOLD_MASK =
        0x00000000000000000000000000000000000000000000000000000000FFFF0000; // prettier-ignore
    uint256 internal constant LIQUIDATION_BONUS_MASK =
        0x0000000000000000000000000000000000000000000000000000FFFF00000000; // prettier-ignore
    uint256 internal constant DECIMALS_MASK =
        0x00000000000000000000000000000000000000000000000000FF000000000000; // prettier-ignore
    uint256 internal constant ACTIVE_MASK =
        0x0000000000000000000000000000000000000000000000000100000000000000; // prettier-ignore
    uint256 internal constant FROZEN_MASK =
        0x0000000000000000000000000000000000000000000000000200000000000000; // prettier-ignore
    uint256 internal constant BORROWING_MASK =
        0x0000000000000000000000000000000000000000000000000400000000000000; // prettier-ignore
    // @notice there is an unoccupied hole of 1 bit at position 59 from pre 3.2 stableBorrowRateEnabled
    uint256 internal constant PAUSED_MASK =
        0x0000000000000000000000000000000000000000000000001000000000000000; // prettier-ignore
    // @notice there is an unoccupied hole of 2 bit at position 61-62 from pre 3.7 borrowableInIsolation and siloedBorrowing
    uint256 internal constant FLASHLOAN_ENABLED_MASK =
        0x0000000000000000000000000000000000000000000000008000000000000000; // prettier-ignore
    uint256 internal constant RESERVE_FACTOR_MASK =
        0x00000000000000000000000000000000000000000000FFFF0000000000000000; // prettier-ignore
    uint256 internal constant BORROW_CAP_MASK =
        0x00000000000000000000000000000000000FFFFFFFFF00000000000000000000; // prettier-ignore
    uint256 internal constant SUPPLY_CAP_MASK =
        0x00000000000000000000000000FFFFFFFFF00000000000000000000000000000; // prettier-ignore
    uint256 internal constant LIQUIDATION_PROTOCOL_FEE_MASK =
        0x0000000000000000000000FFFF00000000000000000000000000000000000000; // prettier-ignore
    //@notice there is an unoccupied hole of 8 bits from 168 to 175 left from pre 3.2 eModeCategory
    //@notice there is an unoccupied hole of 34 bits from 176 to 211 left from pre 3.4 unbackedMintCap
    //@notice there is an unoccupied hole of 40 bits from 212 to 251 left from pre 3.7 debtCeiling
    //@notice DEPRECATED: in v3.4 all reserves have virtual accounting enabled
    uint256 internal constant VIRTUAL_ACC_ACTIVE_MASK =
        0x1000000000000000000000000000000000000000000000000000000000000000; // prettier-ignore

    /// @dev For the LTV, the start bit is 0 (up to 15), hence no bitshifting is needed
    uint256 internal constant LIQUIDATION_THRESHOLD_START_BIT_POSITION = 16;
    uint256 internal constant LIQUIDATION_BONUS_START_BIT_POSITION = 32;
    uint256 internal constant RESERVE_DECIMALS_START_BIT_POSITION = 48;
    uint256 internal constant IS_ACTIVE_START_BIT_POSITION = 56;
    uint256 internal constant IS_FROZEN_START_BIT_POSITION = 57;
    uint256 internal constant BORROWING_ENABLED_START_BIT_POSITION = 58;
    uint256 internal constant IS_PAUSED_START_BIT_POSITION = 60;
    //@notice there is an unoccupied hole of 1 bits at 61 left from pre 3.7 borrowableInIsolation
    //@notice there is an unoccupied hole of 1 bits at 62 left from pre 3.7 siloedBorrowing
    uint256 internal constant FLASHLOAN_ENABLED_START_BIT_POSITION = 63;
    uint256 internal constant RESERVE_FACTOR_START_BIT_POSITION = 64;
    uint256 internal constant BORROW_CAP_START_BIT_POSITION = 80;
    uint256 internal constant SUPPLY_CAP_START_BIT_POSITION = 116;
    uint256 internal constant LIQUIDATION_PROTOCOL_FEE_START_BIT_POSITION = 152;
    //@notice there is an unoccupied hole of 8 bits from 168 to 175 left from pre 3.2 eModeCategory
    //@notice there is an unoccupied hole of 34 bits from 176 to 211 left from pre 3.4 unbackedMintCap
    //@notice there is an unoccupied hole of 40 bits from 212 to 251 left from pre 3.7 debtCeiling
    //@notice DEPRECATED: in v3.4 all reserves have virtual accounting enabled
    uint256 internal constant VIRTUAL_ACC_START_BIT_POSITION = 252;

    /**
     * @notice Gets the Loan to Value of the reserve
     * @param self The reserve configuration
     * @return The loan to value
     */
    function getLtv(DataTypes.ReserveConfigurationMap memory self) internal pure returns (uint256) {
        return self.data & LTV_MASK;
    }

    /**
     * @notice Gets the liquidation threshold of the reserve
     * @param self The reserve configuration
     * @return The liquidation threshold
     */
    function getLiquidationThreshold(DataTypes.ReserveConfigurationMap memory self)
        internal
        pure
        returns (uint256)
    {
        return (self.data & LIQUIDATION_THRESHOLD_MASK) >> LIQUIDATION_THRESHOLD_START_BIT_POSITION;
    }

    /**
     * @notice Gets the liquidation bonus of the reserve
     * @param self The reserve configuration
     * @return The liquidation bonus
     */
    function getLiquidationBonus(DataTypes.ReserveConfigurationMap memory self)
        internal
        pure
        returns (uint256)
    {
        return (self.data & LIQUIDATION_BONUS_MASK) >> LIQUIDATION_BONUS_START_BIT_POSITION;
    }

    /**
     * @notice Gets the decimals of the underlying asset of the reserve
     * @param self The reserve configuration
     * @return The decimals of the asset
     */
    function getDecimals(DataTypes.ReserveConfigurationMap memory self)
        internal
        pure
        returns (uint256)
    {
        return (self.data & DECIMALS_MASK) >> RESERVE_DECIMALS_START_BIT_POSITION;
    }

    /**
     * @notice Gets the active state of the reserve
     * @param self The reserve configuration
     * @return The active state
     */
    function getActive(DataTypes.ReserveConfigurationMap memory self) internal pure returns (bool) {
        return (self.data & ACTIVE_MASK) != 0;
    }

    /**
     * @notice Gets the frozen state of the reserve
     * @param self The reserve configuration
     * @return The frozen state
     */
    function getFrozen(DataTypes.ReserveConfigurationMap memory self) internal pure returns (bool) {
        return (self.data & FROZEN_MASK) != 0;
    }

    /**
     * @notice Gets the paused state of the reserve
     * @param self The reserve configuration
     * @return The paused state
     */
    function getPaused(DataTypes.ReserveConfigurationMap memory self) internal pure returns (bool) {
        return (self.data & PAUSED_MASK) != 0;
    }

    /**
     * @notice Gets the borrowing state of the reserve
     * @param self The reserve configuration
     * @return The borrowing state
     */
    function getBorrowingEnabled(DataTypes.ReserveConfigurationMap memory self)
        internal
        pure
        returns (bool)
    {
        return (self.data & BORROWING_MASK) != 0;
    }

    /**
     * @notice Gets the reserve factor of the reserve
     * @param self The reserve configuration
     * @return The reserve factor
     */
    function getReserveFactor(DataTypes.ReserveConfigurationMap memory self)
        internal
        pure
        returns (uint256)
    {
        return (self.data & RESERVE_FACTOR_MASK) >> RESERVE_FACTOR_START_BIT_POSITION;
    }

    /**
     * @notice Gets the borrow cap of the reserve
     * @param self The reserve configuration
     * @return The borrow cap
     */
    function getBorrowCap(DataTypes.ReserveConfigurationMap memory self)
        internal
        pure
        returns (uint256)
    {
        return (self.data & BORROW_CAP_MASK) >> BORROW_CAP_START_BIT_POSITION;
    }

    /**
     * @notice Gets the supply cap of the reserve
     * @param self The reserve configuration
     * @return The supply cap
     */
    function getSupplyCap(DataTypes.ReserveConfigurationMap memory self)
        internal
        pure
        returns (uint256)
    {
        return (self.data & SUPPLY_CAP_MASK) >> SUPPLY_CAP_START_BIT_POSITION;
    }

    /**
     * @dev Gets the liquidation protocol fee
     * @param self The reserve configuration
     * @return The liquidation protocol fee
     */
    function getLiquidationProtocolFee(DataTypes.ReserveConfigurationMap memory self)
        internal
        pure
        returns (uint256)
    {
        return (self.data & LIQUIDATION_PROTOCOL_FEE_MASK)
            >> LIQUIDATION_PROTOCOL_FEE_START_BIT_POSITION;
    }

    /**
     * @notice Gets the flashloanable flag for the reserve
     * @param self The reserve configuration
     * @return The flashloanable flag
     */
    function getFlashLoanEnabled(DataTypes.ReserveConfigurationMap memory self)
        internal
        pure
        returns (bool)
    {
        return (self.data & FLASHLOAN_ENABLED_MASK) != 0;
    }

    /**
     * @notice Gets the configuration flags of the reserve
     * @param self The reserve configuration
     * @return The state flag representing active
     * @return The state flag representing frozen
     * @return The state flag representing borrowing enabled
     * @return The state flag representing paused
     */
    function getFlags(DataTypes.ReserveConfigurationMap memory self)
        internal
        pure
        returns (bool, bool, bool, bool)
    {
        uint256 dataLocal = self.data;

        return (
            (dataLocal & ACTIVE_MASK) != 0,
            (dataLocal & FROZEN_MASK) != 0,
            (dataLocal & BORROWING_MASK) != 0,
            (dataLocal & PAUSED_MASK) != 0
        );
    }

    /**
     * @notice Gets the configuration parameters of the reserve from storage
     * @param self The reserve configuration
     * @return The state param representing ltv
     * @return The state param representing liquidation threshold
     * @return The state param representing liquidation bonus
     * @return The state param representing reserve decimals
     * @return The state param representing reserve factor
     */
    function getParams(DataTypes.ReserveConfigurationMap memory self)
        internal
        pure
        returns (uint256, uint256, uint256, uint256, uint256)
    {
        uint256 dataLocal = self.data;

        return (
            dataLocal & LTV_MASK,
            (dataLocal & LIQUIDATION_THRESHOLD_MASK) >> LIQUIDATION_THRESHOLD_START_BIT_POSITION,
            (dataLocal & LIQUIDATION_BONUS_MASK) >> LIQUIDATION_BONUS_START_BIT_POSITION,
            (dataLocal & DECIMALS_MASK) >> RESERVE_DECIMALS_START_BIT_POSITION,
            (dataLocal & RESERVE_FACTOR_MASK) >> RESERVE_FACTOR_START_BIT_POSITION
        );
    }

    /**
     * @notice Gets the caps parameters of the reserve from storage
     * @param self The reserve configuration
     * @return The state param representing borrow cap
     * @return The state param representing supply cap.
     */
    function getCaps(DataTypes.ReserveConfigurationMap memory self)
        internal
        pure
        returns (uint256, uint256)
    {
        uint256 dataLocal = self.data;

        return (
            (dataLocal & BORROW_CAP_MASK) >> BORROW_CAP_START_BIT_POSITION,
            (dataLocal & SUPPLY_CAP_MASK) >> SUPPLY_CAP_START_BIT_POSITION
        );
    }
}
