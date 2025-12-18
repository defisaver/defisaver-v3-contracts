// SPDX-License-Identifier: BUSL-1.1
pragma solidity =0.8.24;

library DataTypes {
    /// @dev Legacy reserve data
    struct ReserveData {
        //stores the reserve configuration
        ReserveConfigurationMap configuration;
        //the liquidity index. Expressed in ray
        uint128 liquidityIndex;
        //the current supply rate. Expressed in ray
        uint128 currentLiquidityRate;
        //variable borrow index. Expressed in ray
        uint128 variableBorrowIndex;
        //the current variable borrow rate. Expressed in ray
        uint128 currentVariableBorrowRate;
        // DEPRECATED on v3.2.0
        uint128 currentStableBorrowRate;
        //timestamp of last update
        uint40 lastUpdateTimestamp;
        //the id of the reserve. Represents the position in the list of the active reserves
        uint16 id;
        //aToken address
        address aTokenAddress;
        // DEPRECATED on v3.2.0
        address stableDebtTokenAddress;
        //variableDebtToken address
        address variableDebtTokenAddress;
        // DEPRECATED on v3.4.0, should use the `RESERVE_INTEREST_RATE_STRATEGY` variable from the Pool contract
        address interestRateStrategyAddress;
        //the current treasury balance, scaled
        uint128 accruedToTreasury;
        // DEPRECATED on v3.4.0
        uint128 unbacked;
        //the outstanding debt borrowed against this asset in isolation mode
        uint128 isolationModeTotalDebt;
    }

    struct ReserveConfigurationMap {
        //bit 0-15: LTV
        //bit 16-31: Liq. threshold
        //bit 32-47: Liq. bonus
        //bit 48-55: Decimals
        //bit 56: reserve is active
        //bit 57: reserve is frozen
        //bit 58: borrowing is enabled
        //bit 59: DEPRECATED: stable rate borrowing enabled
        //bit 60: asset is paused
        //bit 61: borrowing in isolation mode is enabled
        //bit 62: siloed borrowing enabled
        //bit 63: flashloaning enabled
        //bit 64-79: reserve factor
        //bit 80-115: borrow cap in whole tokens, borrowCap == 0 => no cap
        //bit 116-151: supply cap in whole tokens, supplyCap == 0 => no cap
        //bit 152-167: liquidation protocol fee
        //bit 168-175: DEPRECATED: eMode category
        //bit 176-211: DEPRECATED: unbacked mint cap
        //bit 212-251: debt ceiling for isolation mode with (ReserveConfiguration::DEBT_CEILING_DECIMALS) decimals
        //bit 252: DEPRECATED: virtual accounting is enabled for the reserve
        //bit 253-255 unused
        uint256 data;
    }

    struct UserConfigurationMap {
        /**
         * @dev Bitmap of the users collaterals and borrows. It is divided in pairs of bits, one pair per asset.
         * The first bit indicates if an asset is used as collateral by the user, the second whether an
         * asset is borrowed by the user.
         */
        uint256 data;
    }

    // DEPRECATED: kept for backwards compatibility, might be removed in a future version
    struct EModeCategoryLegacy {
        // each eMode category has a custom ltv and liquidation threshold
        uint16 ltv;
        uint16 liquidationThreshold;
        uint16 liquidationBonus;
        // DEPRECATED
        address priceSource;
        string label;
    }

    struct CollateralConfig {
        uint16 ltv;
        uint16 liquidationThreshold;
        uint16 liquidationBonus;
    }

    struct EModeCategoryBaseConfiguration {
        uint16 ltv;
        uint16 liquidationThreshold;
        uint16 liquidationBonus;
        string label;
    }

    struct EModeCategoryNew {
        // each eMode category has a custom ltv and liquidation threshold
        uint16 ltv;
        uint16 liquidationThreshold;
        uint16 liquidationBonus;
        uint128 collateralBitmap;
        uint128 borrowableBitmap;
        uint128 ltvzeroBitmap; // if true, the asset will be treated as ltv0 and ltv0 rules apply. Added in aave v3.6
        string label; // soft deprecated, will not be used after aave v3.6
    }

    enum InterestRateMode {
        NONE,
        _DEPRECATED,
        VARIABLE
    }

    struct CalculateUserAccountDataParams {
        UserConfigurationMap userConfig;
        uint256 reservesCount;
        address user;
        address oracle;
        uint8 userEModeCategory;
    }

    struct CalculateInterestRatesParams {
        uint256 unbacked;
        uint256 liquidityAdded;
        uint256 liquidityTaken;
        uint256 totalDebt;
        uint256 reserveFactor;
        address reserve;
        // @notice DEPRECATED in 3.4, but kept for backwards compatibility
        bool usingVirtualBalance;
        uint256 virtualUnderlyingBalance;
    }
}
