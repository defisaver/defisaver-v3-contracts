// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

/// @title IHub
/// @author Aave Labs
/// @notice Full interface for the Hub.
/// @dev This interface is modified by DFS to bundle all methods into single interface and remove unused stuff.
interface IHub {
    /**
     *
     *
     *
     *          DATA SPECIFICATION
     *
     *
     *
     */
    /// @notice Asset position and configuration data.
    /// @dev liquidity The liquidity available to be accessed, expressed in asset units.
    /// @dev realizedFees The amount of fees realized but not yet minted, expressed in asset units.
    /// @dev decimals The number of decimals of the underlying asset.
    /// @dev addedShares The total shares added across all spokes.
    /// @dev swept The outstanding liquidity which has been invested by the reinvestment controller, expressed in asset units.
    /// @dev realizedPremiumRay The interest-free premium already accrued across all spokes, expressed in asset units and scaled by RAY.
    /// @dev premiumOffsetRay The total premium offset across all spokes, used to calculate the premium, expressed in asset units and scaled by RAY.
    /// @dev drawnShares The total drawn shares across all spokes.
    /// @dev premiumShares The total premium shares across all spokes.
    /// @dev liquidityFee The protocol fee charged on drawn and premium liquidity growth, expressed in BPS.
    /// @dev drawnIndex The drawn index which monotonically increases according to the drawn rate, expressed in RAY.
    /// @dev drawnRate The rate at which drawn assets grows, expressed in RAY.
    /// @dev lastUpdateTimestamp The timestamp of the last accrual.
    /// @dev underlying The address of the underlying asset.
    /// @dev irStrategy The address of the interest rate strategy.
    /// @dev reinvestmentController The address of the reinvestment controller.
    /// @dev feeReceiver The address of the fee receiver spoke.
    /// @dev deficitRay The amount of outstanding bad debt across all spokes, expressed in asset units and scaled by RAY.
    struct Asset {
        uint120 liquidity;
        uint120 realizedFees;
        uint8 decimals;
        //
        uint120 addedShares;
        uint120 swept;
        //
        uint200 realizedPremiumRay;
        //
        uint200 premiumOffsetRay;
        //
        uint120 drawnShares;
        uint120 premiumShares;
        uint16 liquidityFee;
        //
        uint120 drawnIndex;
        uint96 drawnRate;
        uint40 lastUpdateTimestamp;
        //
        address underlying;
        //
        address irStrategy;
        //
        address reinvestmentController;
        //
        address feeReceiver;
        //
        uint200 deficitRay;
    }

    /// @notice Asset configuration. Subset of the `Asset` struct.
    struct AssetConfig {
        address feeReceiver;
        uint16 liquidityFee;
        address irStrategy;
        address reinvestmentController;
    }

    /// @notice Spoke position and configuration data.
    /// @dev drawnShares The drawn shares of a spoke for a given asset.
    /// @dev premiumShares The premium shares of a spoke for a given asset.
    /// @dev premiumOffsetRay The premium offset of a spoke for a given asset, used to calculate the premium, expressed in asset units and scaled by RAY.
    /// @dev realizedPremiumRay The interest-free premium already accrued for a spoke for a given asset, expressed in asset units and scaled by RAY.
    /// @dev addedShares The added shares of a spoke for a given asset.
    /// @dev addCap The maximum amount that can be added by a spoke, expressed in whole assets (not scaled by decimals). A value of `MAX_ALLOWED_SPOKE_CAP` indicates no cap.
    /// @dev drawCap The maximum amount that can be drawn by a spoke, expressed in whole assets (not scaled by decimals). A value of `MAX_ALLOWED_SPOKE_CAP` indicates no cap.
    /// @dev riskPremiumThreshold The maximum ratio of premium to drawn shares a spoke can have, expressed in BPS. A value of `MAX_RISK_PREMIUM_THRESHOLD` indicates no threshold.
    /// @dev active True if the spoke is prevented from performing any actions.
    /// @dev paused True if the spoke is prevented from performing actions that instantly update the liquidity.
    /// @dev deficitRay The deficit reported by a spoke for a given asset, expressed in asset units and scaled by RAY.
    struct SpokeData {
        uint120 drawnShares;
        uint120 premiumShares;
        //
        uint200 premiumOffsetRay;
        //
        uint200 realizedPremiumRay;
        //
        uint120 addedShares;
        uint40 addCap;
        uint40 drawCap;
        uint24 riskPremiumThreshold;
        bool active;
        bool paused;
        //
        uint200 deficitRay;
    }

    /// @notice Spoke configuration data. Subset of the `SpokeData` struct.
    struct SpokeConfig {
        uint40 addCap;
        uint40 drawCap;
        uint24 riskPremiumThreshold;
        bool active;
        bool paused;
    }

    /// @notice Changes to premium owed accounting.
    /// @dev sharesDelta The change in premium shares.
    /// @dev offsetDeltaRay The change in premium offset, expressed in asset units and scaled by RAY.
    /// @dev accruedPremiumRay The accrued premium, expressed in asset units and scaled by RAY.
    /// @dev restoredPremiumRay The restored premium, expressed in asset units and scaled by RAY.
    struct PremiumDelta {
        int256 sharesDelta;
        int256 offsetDeltaRay;
        uint256 accruedPremiumRay;
        uint256 restoredPremiumRay;
    }

    /**
     *
     *
     *
     *          READ OPERATIONS
     *
     *
     *
     */
    /// @notice Converts the specified amount of assets to shares upon an `add` action.
    /// @dev Rounds down to the nearest shares amount.
    /// @param assetId The identifier of the asset.
    /// @param assets The amount of assets to convert to shares amount.
    /// @return The amount of shares converted from assets amount.
    function previewAddByAssets(uint256 assetId, uint256 assets) external view returns (uint256);

    /// @notice Converts the specified shares amount to assets amount added upon an `add` action.
    /// @dev Rounds up to the nearest assets amount.
    /// @param assetId The identifier of the asset.
    /// @param shares The amount of shares to convert to assets amount.
    /// @return The amount of assets converted from shares amount.
    function previewAddByShares(uint256 assetId, uint256 shares) external view returns (uint256);

    /// @notice Converts the specified amount of assets to shares amount removed upon a `remove` action.
    /// @dev Rounds up to the nearest shares amount.
    /// @param assetId The identifier of the asset.
    /// @param assets The amount of assets to convert to shares amount.
    /// @return The amount of shares converted from assets amount.
    function previewRemoveByAssets(uint256 assetId, uint256 assets) external view returns (uint256);

    /// @notice Converts the specified amount of shares to assets amount removed upon a `remove` action.
    /// @dev Rounds down to the nearest assets amount.
    /// @param assetId The identifier of the asset.
    /// @param shares The amount of shares to convert to assets amount.
    /// @return The amount of assets converted from shares amount.
    function previewRemoveByShares(uint256 assetId, uint256 shares) external view returns (uint256);

    /// @notice Converts the specified amount of assets to shares amount drawn upon a `draw` action.
    /// @dev Rounds up to the nearest shares amount.
    /// @param assetId The identifier of the asset.
    /// @param assets The amount of assets to convert to shares amount.
    /// @return The amount of shares converted from assets amount.
    function previewDrawByAssets(uint256 assetId, uint256 assets) external view returns (uint256);

    /// @notice Converts the specified amount of shares to assets amount drawn upon a `draw` action.
    /// @dev Rounds down to the nearest assets amount.
    /// @param assetId The identifier of the asset.
    /// @param shares The amount of shares to convert to assets amount.
    /// @return The amount of assets converted from shares amount.
    function previewDrawByShares(uint256 assetId, uint256 shares) external view returns (uint256);

    /// @notice Converts the specified amount of assets to shares amount restored upon a `restore` action.
    /// @dev Rounds down to the nearest shares amount.
    /// @param assetId The identifier of the asset.
    /// @param assets The amount of assets to convert to shares amount.
    /// @return The amount of shares converted from assets amount.
    function previewRestoreByAssets(uint256 assetId, uint256 assets) external view returns (uint256);

    /// @notice Converts the specified amount of shares to assets amount restored upon a `restore` action.
    /// @dev Rounds up to the nearest assets amount.
    /// @param assetId The identifier of the asset.
    /// @param shares The amount of drawn shares to convert to assets amount.
    /// @return The amount of assets converted from shares amount.
    function previewRestoreByShares(uint256 assetId, uint256 shares) external view returns (uint256);

    /// @notice Returns the underlying address and decimals of the specified asset.
    /// @param assetId The identifier of the asset.
    /// @return The underlying address of the asset.
    /// @return The decimals of the asset.
    function getAssetUnderlyingAndDecimals(uint256 assetId) external view returns (address, uint8);

    /// @notice Calculates the current drawn index for the specified asset.
    /// @param assetId The identifier of the asset.
    /// @return The current drawn index of the asset.
    function getAssetDrawnIndex(uint256 assetId) external view returns (uint256);

    /// @notice Returns the total amount of the specified asset added to the Hub.
    /// @param assetId The identifier of the asset.
    /// @return The amount of the asset added.
    function getAddedAssets(uint256 assetId) external view returns (uint256);

    /// @notice Returns the total amount of shares of the specified asset added to the Hub.
    /// @param assetId The identifier of the asset.
    /// @return The amount of shares of the asset added.
    function getAddedShares(uint256 assetId) external view returns (uint256);

    /// @notice Returns the amount of owed drawn and premium assets for the specified asset.
    /// @param assetId The identifier of the asset.
    /// @return The amount of owed drawn assets.
    /// @return The amount of owed premium assets.
    function getAssetOwed(uint256 assetId) external view returns (uint256, uint256);

    /// @notice Returns the total amount of assets owed to the Hub.
    /// @param assetId The identifier of the asset.
    /// @return The total amount of the assets owed.
    function getAssetTotalOwed(uint256 assetId) external view returns (uint256);

    /// @notice Returns the amount of owed premium with full precision for specified asset.
    /// @param assetId The identifier of the asset.
    /// @return The amount of premium owed, expressed in asset units and scaled by RAY.
    function getAssetPremiumRay(uint256 assetId) external view returns (uint256);

    /// @notice Returns the amount of drawn shares of the specified asset.
    /// @param assetId The identifier of the asset.
    /// @return The amount of drawn shares.
    function getAssetDrawnShares(uint256 assetId) external view returns (uint256);

    /// @notice Returns the information regarding premium shares of the specified asset.
    /// @param assetId The identifier of the asset.
    /// @return The amount of premium shares owed to the asset.
    /// @return The premium offset of the asset, expressed in asset units and scaled by RAY.
    /// @return The realized premium of the asset, expressed in asset units and scaled by RAY.
    function getAssetPremiumData(uint256 assetId) external view returns (uint256, uint256, uint256);

    /// @notice Returns the amount of available liquidity for the specified asset.
    /// @param assetId The identifier of the asset.
    /// @return The amount of available liquidity.
    function getAssetLiquidity(uint256 assetId) external view returns (uint256);

    /// @notice Returns the amount of deficit with full precision of the specified asset.
    /// @param assetId The identifier of the asset.
    /// @return The amount of deficit, expressed in asset units and scaled by RAY.
    function getAssetDeficitRay(uint256 assetId) external view returns (uint256);

    /// @notice Returns the total amount of the specified assets added to the Hub by the specified spoke.
    /// @dev If spoke is `asset.feeReceiver`, includes converted `unrealizedFeeShares` in return value.
    /// @param assetId The identifier of the asset.
    /// @param spoke The address of the spoke.
    /// @return The amount of added assets.
    function getSpokeAddedAssets(uint256 assetId, address spoke) external view returns (uint256);

    /// @notice Returns the total amount of shares of the specified asset added to the Hub by the specified spoke.
    /// @dev If spoke is `asset.feeReceiver`, includes `unrealizedFeeShares` in return value.
    /// @param assetId The identifier of the asset.
    /// @param spoke The address of the spoke.
    /// @return The amount of added shares.
    function getSpokeAddedShares(uint256 assetId, address spoke) external view returns (uint256);

    /// @notice Returns the amount of the specified assets owed to the Hub by the specified spoke.
    /// @param assetId The identifier of the asset.
    /// @param spoke The address of the spoke.
    /// @return The amount of owed drawn assets.
    /// @return The amount of owed premium assets.
    function getSpokeOwed(uint256 assetId, address spoke) external view returns (uint256, uint256);

    /// @notice Returns the total amount of the specified asset owed to the Hub by the specified spoke.
    /// @param assetId The identifier of the asset.
    /// @param spoke The address of the spoke.
    /// @return The total amount of the asset owed.
    function getSpokeTotalOwed(uint256 assetId, address spoke) external view returns (uint256);

    /// @notice Returns the amount of owed premium with full precision for specified asset and spoke.
    /// @param assetId The identifier of the asset.
    /// @param spoke The address of the spoke.
    /// @return The amount of owed premium assets, expressed in asset units and scaled by RAY.
    function getSpokePremiumRay(uint256 assetId, address spoke) external view returns (uint256);

    /// @notice Returns the amount of drawn shares of the specified asset by the specified spoke.
    /// @param assetId The identifier of the asset.
    /// @param spoke The address of the spoke.
    /// @return The amount of drawn shares.
    function getSpokeDrawnShares(uint256 assetId, address spoke) external view returns (uint256);

    /// @notice Returns the information regarding premium shares of the specified asset for the specified spoke.
    /// @param assetId The identifier of the asset.
    /// @param spoke The address of the spoke.
    /// @return The amount of premium shares.
    /// @return The premium offset, expressed in asset units and scaled by RAY.
    /// @return The realized premium, expressed in asset units and scaled by RAY.
    function getSpokePremiumData(uint256 assetId, address spoke)
        external
        view
        returns (uint256, uint256, uint256);

    /// @notice Returns the amount of a given spoke's deficit with full precision for the specified asset.
    /// @param assetId The identifier of the asset.
    /// @param spoke The address of the spoke.
    /// @return The amount of deficit, expressed in asset units and scaled by RAY.
    function getSpokeDeficitRay(uint256 assetId, address spoke) external view returns (uint256);

    /// @notice Returns whether the underlying is listed as an asset.
    /// @param underlying The address of the underlying asset.
    /// @return True if the underlying asset is listed.
    function isUnderlyingListed(address underlying) external view returns (bool);

    /// @notice Returns the number of listed assets.
    /// @return The number of listed assets.
    function getAssetCount() external view returns (uint256);

    /// @notice Returns information regarding the specified asset.
    /// @dev `drawnIndex`, `drawnRate` and `lastUpdateTimestamp` can be outdated due to passage of time.
    /// @param assetId The identifier of the asset.
    /// @return The asset struct.
    function getAsset(uint256 assetId) external view returns (Asset memory);

    /// @notice Returns the asset configuration for the specified asset.
    /// @param assetId The identifier of the asset.
    /// @return The asset configuration struct.
    function getAssetConfig(uint256 assetId) external view returns (AssetConfig memory);

    /// @notice Returns the accrued fees for the asset, expressed in asset units.
    /// @dev Accrued fees are excluded from total added assets.
    /// @param assetId The identifier of the asset.
    /// @return The amount of accrued fees.
    function getAssetAccruedFees(uint256 assetId) external view returns (uint256);

    /// @notice Returns the amount of liquidity swept by the reinvestment controller for the specified asset.
    /// @param assetId The identifier of the asset.
    /// @return The amount of liquidity swept.
    function getAssetSwept(uint256 assetId) external view returns (uint256);

    /// @notice Returns the current drawn rate for the specified asset.
    /// @param assetId The identifier of the asset.
    /// @return The current drawn rate of the asset.
    function getAssetDrawnRate(uint256 assetId) external view returns (uint256);

    /// @notice Returns the number of spokes listed for the specified asset.
    /// @param assetId The identifier of the asset.
    /// @return The number of spokes.
    function getSpokeCount(uint256 assetId) external view returns (uint256);

    /// @notice Returns whether the spoke is listed for the specified asset.
    /// @param assetId The identifier of the asset.
    /// @param spoke The address of the spoke.
    /// @return True if the spoke is listed.
    function isSpokeListed(uint256 assetId, address spoke) external view returns (bool);

    /// @notice Returns the address of the spoke for an asset at the given index.
    /// @param assetId The identifier of the asset.
    /// @param index The index of the spoke.
    /// @return The address of the spoke.
    function getSpokeAddress(uint256 assetId, uint256 index) external view returns (address);

    /// @notice Returns the spoke data struct.
    /// @param assetId The identifier of the asset.
    /// @param spoke The address of the spoke.
    /// @return The spoke data struct.
    function getSpoke(uint256 assetId, address spoke) external view returns (SpokeData memory);

    /// @notice Returns the spoke configuration struct.
    /// @param assetId The identifier of the asset.
    /// @param spoke The address of the spoke.
    /// @return The spoke configuration struct.
    function getSpokeConfig(uint256 assetId, address spoke)
        external
        view
        returns (SpokeConfig memory);

    /// @notice Returns the maximum allowed number of decimals for the underlying asset.
    /// @return The maximum number of decimals (inclusive).
    function MAX_ALLOWED_UNDERLYING_DECIMALS() external view returns (uint8);

    /// @notice Returns the minimum allowed number of decimals for the underlying asset.
    /// @return The minimum number of decimals (inclusive).
    function MIN_ALLOWED_UNDERLYING_DECIMALS() external view returns (uint8);

    /// @notice Returns the maximum value for any spoke cap (add or draw).
    /// @dev The value is not inclusive; using the maximum value indicates no cap.
    /// @return The maximum cap value, expressed in asset units.
    function MAX_ALLOWED_SPOKE_CAP() external view returns (uint40);

    /// @notice Returns the maximum value for any spoke risk premium threshold.
    /// @dev The value is not inclusive; using the maximum value indicates no threshold.
    /// @return The maximum risk premium threshold, expressed in BPS.
    function MAX_RISK_PREMIUM_THRESHOLD() external view returns (uint24);
}
