// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

/// @title ISpoke
/// @author Aave Labs
/// @notice Full interface for Spoke.
/// @dev This interface is modified by DFS to bundle all methods into single interface and remove unused stuff.
interface ISpoke {
    /**
     *
     *
     *
     *          DATA SPECIFICATION
     *
     *
     *
     */
    /// @notice Reserve level data.
    /// @dev underlying The address of the underlying asset.
    /// @dev hub The address of the associated Hub.
    /// @dev assetId The identifier of the asset in the Hub.
    /// @dev decimals The number of decimals of the underlying asset.
    /// @dev dynamicConfigKey The key of the last reserve dynamic config.
    /// @dev paused True if all actions are prevented for the reserve.
    /// @dev frozen True if new activity is prevented for the reserve.
    /// @dev borrowable True if the reserve is borrowable.
    /// @dev collateralRisk The risk associated with a collateral asset, expressed in BPS.
    struct Reserve {
        address underlying;
        address hub;
        uint16 assetId;
        uint8 decimals;
        uint24 dynamicConfigKey;
        bool paused;
        bool frozen;
        bool borrowable;
        uint24 collateralRisk;
    }

    /// @notice Reserve configuration. Subset of the `Reserve` struct.
    struct ReserveConfig {
        bool paused;
        bool frozen;
        bool borrowable;
        uint24 collateralRisk;
    }

    /// @notice Dynamic reserve configuration data.
    /// @dev collateralFactor The proportion of a reserve's value eligible to be used as collateral, expressed in BPS.
    /// @dev maxLiquidationBonus The maximum extra amount of collateral given to the liquidator as bonus, expressed in BPS. 100_00 represents 0.00% bonus.
    /// @dev liquidationFee The protocol fee charged on liquidations, taken from the collateral bonus given to the liquidator, expressed in BPS.
    struct DynamicReserveConfig {
        uint16 collateralFactor;
        uint32 maxLiquidationBonus;
        uint16 liquidationFee;
    }

    /// @notice Liquidation configuration data.
    /// @dev targetHealthFactor The ideal health factor to restore a user position during liquidation, expressed in WAD.
    /// @dev healthFactorForMaxBonus The health factor under which liquidation bonus is maximum, expressed in WAD.
    /// @dev liquidationBonusFactor The value multiplied by `maxLiquidationBonus` to compute the minimum liquidation bonus, expressed in BPS.
    struct LiquidationConfig {
        uint128 targetHealthFactor;
        uint64 healthFactorForMaxBonus;
        uint16 liquidationBonusFactor;
    }

    /// @notice User position data per reserve.
    /// @dev drawnShares The drawn shares of the user position.
    /// @dev realizedPremiumRay The interest-free premium debt already accrued for the user position, expressed in asset units and scaled by RAY.
    /// @dev premiumShares The premium shares of the user position.
    /// @dev premiumOffsetRay The premium offset of the user position, used to calculate the premium, expressed in asset units and scaled by RAY.
    /// @dev suppliedShares The supplied shares of the user position.
    /// @dev dynamicConfigKey The key of the user position dynamic config.
    struct UserPosition {
        uint120 drawnShares;
        uint120 premiumShares;
        uint200 realizedPremiumRay;
        uint200 premiumOffsetRay;
        uint120 suppliedShares;
        uint24 dynamicConfigKey;
    }

    /// @notice Position manager configuration data.
    /// @dev approval The mapping of position manager user approvals.
    /// @dev active True if the position manager is active.
    struct PositionManagerConfig {
        mapping(address user => bool) approval;
        bool active;
    }

    /// @notice User position status data.
    /// @dev map The map of bitmap buckets for the position status.
    /// @dev hasPositiveRiskPremium True if the user position has a risk premium strictly greater than 0.
    struct PositionStatus {
        mapping(uint256 bucket => uint256) map;
        bool hasPositiveRiskPremium;
    }

    /// @notice User account data describing a user position and its health.
    /// @dev riskPremium The risk premium of the user position, expressed in BPS.
    /// @dev avgCollateralFactor The weighted average collateral factor of the user position, expressed in WAD.
    /// @dev healthFactor The health factor of the user position, expressed in WAD. 1e18 represents a health factor of 1.00.
    /// @dev totalCollateralValue The total collateral value of the user position, expressed in units of base currency. 1e26 represents 1 USD.
    /// @dev totalDebtValue The total debt value of the user position, expressed in units of base currency. 1e26 represents 1 USD.
    /// @dev activeCollateralCount The number of active collaterals, which includes reserves with `collateralFactor` > 0, `enabledAsCollateral` and `suppliedAmount` > 0.
    /// @dev borrowedCount The number of borrowed reserves of the user position.
    struct UserAccountData {
        uint256 riskPremium;
        uint256 avgCollateralFactor;
        uint256 healthFactor;
        uint256 totalCollateralValue;
        uint256 totalDebtValue;
        uint256 activeCollateralCount;
        uint256 borrowedCount;
    }

    /**
     *
     *
     *
     *          WRITE OPERATIONS
     *
     *
     *
     */
    /// @notice Supplies an amount of underlying asset of the specified reserve.
    /// @dev It reverts if the reserve associated with the given reserve identifier is not listed.
    /// @dev The Spoke pulls the underlying asset from the caller, so prior token approval is required.
    /// @dev Caller must be `onBehalfOf` or an authorized position manager for `onBehalfOf`.
    /// @param reserveId The reserve identifier.
    /// @param amount The amount of asset to supply.
    /// @param onBehalfOf The owner of the position to add supply shares to.
    /// @return The amount of shares supplied.
    /// @return The amount of assets supplied.
    function supply(uint256 reserveId, uint256 amount, address onBehalfOf)
        external
        returns (uint256, uint256);

    /// @notice Withdraws a specified amount of underlying asset from the given reserve.
    /// @dev It reverts if the reserve associated with the given reserve identifier is not listed.
    /// @dev Providing an amount greater than the maximum withdrawable value signals a full withdrawal.
    /// @dev Caller must be `onBehalfOf` or an authorized position manager for `onBehalfOf`.
    /// @dev Caller receives the underlying asset withdrawn.
    /// @param reserveId The identifier of the reserve.
    /// @param amount The amount of asset to withdraw.
    /// @param onBehalfOf The owner of position to remove supply shares from.
    /// @return The amount of shares withdrawn.
    /// @return The amount of assets withdrawn.
    function withdraw(uint256 reserveId, uint256 amount, address onBehalfOf)
        external
        returns (uint256, uint256);

    /// @notice Borrows a specified amount of underlying asset from the given reserve.
    /// @dev It reverts if the reserve associated with the given reserve identifier is not listed.
    /// @dev Caller must be `onBehalfOf` or an authorized position manager for `onBehalfOf`.
    /// @dev Caller receives the underlying asset borrowed.
    /// @param reserveId The identifier of the reserve.
    /// @param amount The amount of asset to borrow.
    /// @param onBehalfOf The owner of the position against which debt is generated.
    /// @return The amount of shares borrowed.
    /// @return The amount of assets borrowed.
    function borrow(uint256 reserveId, uint256 amount, address onBehalfOf)
        external
        returns (uint256, uint256);

    /// @notice Repays a specified amount of underlying asset to a given reserve.
    /// @dev It reverts if the reserve associated with the given reserve identifier is not listed.
    /// @dev The Spoke pulls the underlying asset from the caller, so prior approval is required.
    /// @dev Caller must be `onBehalfOf` or an authorized position manager for `onBehalfOf`.
    /// @param reserveId The identifier of the reserve.
    /// @param amount The amount of asset to repay.
    /// @param onBehalfOf The owner of the position whose debt is repaid.
    /// @return The amount of shares repaid.
    /// @return The amount of assets repaid.
    function repay(uint256 reserveId, uint256 amount, address onBehalfOf)
        external
        returns (uint256, uint256);

    /// @notice Allows suppliers to enable/disable a specific supplied reserve as collateral.
    /// @dev It reverts if the reserve associated with the given reserve identifier is not listed.
    /// @dev Caller must be `onBehalfOf` or an authorized position manager for `onBehalfOf`.
    /// @param reserveId The reserve identifier of the underlying asset.
    /// @param usingAsCollateral True if the user wants to use the supply as collateral.
    /// @param onBehalfOf The owner of the position being modified.
    function setUsingAsCollateral(uint256 reserveId, bool usingAsCollateral, address onBehalfOf)
        external;

    /// @notice Enables a user to grant or revoke approval for a position manager
    /// @param positionManager The address of the position manager.
    /// @param approve True to approve the position manager, false to revoke approval.
    function setUserPositionManager(address positionManager, bool approve) external;

    /// @notice Enables a user to grant or revoke approval for a position manager using an EIP712-typed intent.
    /// @dev Uses keyed-nonces where for each key's namespace nonce is consumed sequentially.
    /// @param positionManager The address of the position manager.
    /// @param user The address of the user on whose behalf position manager can act.
    /// @param approve True to approve the position manager, false to revoke approval.
    /// @param nonce The key-prefixed nonce for the signature.
    /// @param deadline The deadline for the signature.
    /// @param signature The EIP712-compliant signature bytes.
    function setUserPositionManagerWithSig(
        address positionManager,
        address user,
        bool approve,
        uint256 nonce,
        uint256 deadline,
        bytes calldata signature
    ) external;

    /// @notice Allows consuming a permit signature for the given reserve's underlying asset.
    /// @dev It reverts if the reserve associated with the given reserve identifier is not listed.
    /// @dev Spender is the corresponding Hub of the given reserve.
    /// @param reserveId The identifier of the reserve.
    /// @param onBehalfOf The address of the user on whose behalf the permit is being used.
    /// @param value The amount of the underlying asset to permit.
    /// @param deadline The deadline for the permit.
    function permitReserve(
        uint256 reserveId,
        address onBehalfOf,
        uint256 value,
        uint256 deadline,
        uint8 permitV,
        bytes32 permitR,
        bytes32 permitS
    ) external;

    /// @notice Call multiple functions in the current contract and return the data from each if they all succeed.
    /// @param data The encoded function data for each of the calls to make to this contract.
    /// @return results The results from each of the calls passed in via data.
    function multicall(bytes[] calldata data) external returns (bytes[] memory);

    /**
     *
     *
     *
     *          READ OPERATIONS
     *
     *
     *
     */
    /// @notice Returns the liquidation config struct.
    function getLiquidationConfig() external view returns (LiquidationConfig memory);

    /// @notice Returns the number of listed reserves on the spoke.
    /// @dev Count includes reserves that are not currently active.
    function getReserveCount() external view returns (uint256);

    /// @notice Returns the reserve struct data in storage.
    /// @dev It reverts if the reserve associated with the given reserve identifier is not listed.
    /// @param reserveId The identifier of the reserve.
    function getReserve(uint256 reserveId) external view returns (Reserve memory);

    /// @notice Returns the reserve configuration struct data in storage.
    /// @dev It reverts if the reserve associated with the given reserve identifier is not listed.
    /// @param reserveId The identifier of the reserve.
    function getReserveConfig(uint256 reserveId) external view returns (ReserveConfig memory);

    /// @notice Returns the dynamic reserve configuration struct at the specified key.
    /// @dev It reverts if the reserve associated with the given reserve identifier is not listed.
    /// @dev Does not revert if `dynamicConfigKey` is unset.
    /// @param reserveId The identifier of the reserve.
    /// @param dynamicConfigKey The key of the dynamic config.
    function getDynamicReserveConfig(uint256 reserveId, uint24 dynamicConfigKey)
        external
        view
        returns (DynamicReserveConfig memory);

    /// @notice Returns two flags indicating whether the reserve is used as collateral and whether it is borrowed by the user.
    /// @dev It reverts if the reserve associated with the given reserve identifier is not listed.
    /// @dev Even if enabled as collateral, it will only count towards user position if the collateral factor is greater than 0.
    /// @param reserveId The identifier of the reserve.
    /// @param user The address of the user.
    /// @return True if the reserve is enabled as collateral by the user.
    /// @return True if the reserve is borrowed by the user.
    function getUserReserveStatus(uint256 reserveId, address user)
        external
        view
        returns (bool, bool);

    /// @notice Returns the user position struct in storage.
    /// @dev It reverts if the reserve associated with the given reserve identifier is not listed.
    /// @param reserveId The identifier of the reserve.
    /// @param user The address of the user.
    function getUserPosition(uint256 reserveId, address user)
        external
        view
        returns (UserPosition memory);

    /// @notice Returns the liquidation bonus for a given health factor, based on the user's current dynamic configuration.
    /// @dev It reverts if the reserve associated with the given reserve identifier is not listed.
    /// @param reserveId The identifier of the reserve.
    /// @param user The address of the user.
    /// @param healthFactor The health factor of the user.
    function getLiquidationBonus(uint256 reserveId, address user, uint256 healthFactor)
        external
        view
        returns (uint256);

    /// @notice Returns the most up-to-date user account data information.
    /// @dev Utilizes user's current dynamic configuration of user position.
    function getUserAccountData(address user) external view returns (UserAccountData memory);

    /// @notice Returns whether positionManager is currently activated by governance.
    /// @param positionManager The address of the position manager.
    /// @return True if positionManager is currently active.
    function isPositionManagerActive(address positionManager) external view returns (bool);

    /// @notice Returns whether positionManager is active and approved by user.
    /// @param user The address of the user.
    /// @param positionManager The address of the position manager.
    /// @return True if positionManager is active and approved by user.
    function isPositionManager(address user, address positionManager) external view returns (bool);

    /// @notice Returns the EIP-712 domain separator.
    function DOMAIN_SEPARATOR() external view returns (bytes32);

    /// @notice Returns the address of the AaveOracle contract.
    function ORACLE() external view returns (address);

    /// @notice Returns the total amount of supplied assets of a given reserve.
    /// @param reserveId The identifier of the reserve.
    /// @return The amount of supplied assets.
    function getReserveSuppliedAssets(uint256 reserveId) external view returns (uint256);

    /// @notice Returns the total amount of supplied shares of a given reserve.
    /// @dev It reverts if the reserve associated with the given reserve identifier is not listed.
    /// @param reserveId The identifier of the reserve.
    /// @return The amount of supplied shares.
    function getReserveSuppliedShares(uint256 reserveId) external view returns (uint256);

    /// @notice Returns the debt of a given reserve.
    /// @dev It reverts if the reserve associated with the given reserve identifier is not listed.
    /// @dev The total debt of the reserve is the sum of drawn debt and premium debt.
    /// @param reserveId The identifier of the reserve.
    /// @return The amount of drawn debt.
    /// @return The amount of premium debt.
    function getReserveDebt(uint256 reserveId) external view returns (uint256, uint256);

    /// @notice Returns the total debt of a given reserve.
    /// @dev It reverts if the reserve associated with the given reserve identifier is not listed.
    /// @dev The total debt of the reserve is the sum of drawn debt and premium debt.
    /// @param reserveId The identifier of the reserve.
    /// @return The total debt amount.
    function getReserveTotalDebt(uint256 reserveId) external view returns (uint256);

    /// @notice Returns the amount of assets supplied by a specific user for a given reserve.
    /// @dev It reverts if the reserve associated with the given reserve identifier is not listed.
    /// @param reserveId The identifier of the reserve.
    /// @param user The address of the user.
    /// @return The amount of assets supplied by the user.
    function getUserSuppliedAssets(uint256 reserveId, address user) external view returns (uint256);

    /// @notice Returns the amount of shares supplied by a specific user for a given reserve.
    /// @dev It reverts if the reserve associated with the given reserve identifier is not listed.
    /// @param reserveId The identifier of the reserve.
    /// @param user The address of the user.
    /// @return The amount of shares supplied by the user.
    function getUserSuppliedShares(uint256 reserveId, address user) external view returns (uint256);

    /// @notice Returns the debt of a specific user for a given reserve.
    /// @dev It reverts if the reserve associated with the given reserve identifier is not listed.
    /// @dev The total debt of the user is the sum of drawn debt and premium debt.
    /// @param reserveId The identifier of the reserve.
    /// @param user The address of the user.
    /// @return The amount of drawn debt.
    /// @return The amount of premium debt.
    function getUserDebt(uint256 reserveId, address user) external view returns (uint256, uint256);

    /// @notice Returns the total debt of a specific user for a given reserve.
    /// @dev It reverts if the reserve associated with the given reserve identifier is not listed.
    /// @dev The total debt of the user is the sum of drawn debt and premium debt.
    /// @param reserveId The identifier of the reserve.
    /// @param user The address of the user.
    /// @return The total debt amount.
    function getUserTotalDebt(uint256 reserveId, address user) external view returns (uint256);

    /// @notice Returns the full precision premium debt of a specific user for a given reserve.
    /// @dev It reverts if the reserve associated with the given reserve identifier is not listed.
    /// @param reserveId The identifier of the reserve.
    /// @param user The address of the user.
    /// @return The amount of premium debt, expressed in asset units and scaled by RAY.
    function getUserPremiumDebtRay(uint256 reserveId, address user) external view returns (uint256);

    /// @notice Returns the next unused nonce for an address and key. Result contains the key prefix.
    /// @param owner The address of the nonce over.
    /// @param key The key which specifies namespace of the nonce.
    /// @return keyNonce The first 24 bytes are for the key, & the last 8 bytes for the nonce.
    function nonces(address owner, uint192 key) external view returns (uint256 keyNonce);
}
