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
    /// @dev collateralRisk The risk associated with a collateral asset, expressed in BPS.
    /// @dev flags The packed boolean flags of the reserve.
    /// @dev dynamicConfigKey The key of the last reserve dynamic config.
    struct Reserve {
        address underlying;
        address hub;
        uint16 assetId;
        uint8 decimals;
        uint24 collateralRisk;
        uint8 flags;
        uint32 dynamicConfigKey;
    }

    // TODO: Comment misleading, not subset, also why collateralRisk is here, redudant?
    /// @notice Reserve configuration. Subset of the `Reserve` struct.
    /// @dev collateralRisk The risk associated with a collateral asset, expressed in BPS.
    /// @dev paused True if all actions are prevented for the reserve.
    /// @dev frozen True if new activity is prevented for the reserve.
    /// @dev borrowable True if the reserve is borrowable.
    /// @dev receiveSharesEnabled True if the liquidator can receive collateral shares during liquidation.
    struct ReserveConfig {
        uint24 collateralRisk;
        bool paused;
        bool frozen;
        bool borrowable;
        bool receiveSharesEnabled;
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
    /// @dev premiumShares The premium shares of the user position.
    /// @dev premiumOffsetRay The premium offset of the user position, used to calculate the premium, expressed in asset units and scaled by RAY.
    /// @dev suppliedShares The supplied shares of the user position.
    /// @dev dynamicConfigKey The key of the user position dynamic config.
    struct UserPosition {
        uint120 drawnShares;
        uint120 premiumShares;
        //
        int200 premiumOffsetRay;
        //
        uint120 suppliedShares;
        uint32 dynamicConfigKey;
    }

    /// @notice User account data describing a user position and its health.
    /// @dev riskPremium The risk premium of the user position, expressed in BPS.
    /// @dev avgCollateralFactor The weighted average collateral factor of the user position, expressed in WAD.
    /// @dev healthFactor The health factor of the user position, expressed in WAD. 1e18 represents a health factor of 1.00.
    /// @dev totalCollateralValue The total collateral value of the user position, expressed in units of Value.
    /// @dev totalDebtValueRay The total debt value of the user position, expressed in units of Value and scaled by RAY.
    /// @dev activeCollateralCount The number of active collaterals, which includes reserves with `collateralFactor` > 0, `enabledAsCollateral` and `suppliedAmount` > 0.
    /// @dev borrowCount The number of borrowed reserves of the user position.
    struct UserAccountData {
        uint256 riskPremium;
        uint256 avgCollateralFactor;
        uint256 healthFactor;
        uint256 totalCollateralValue;
        uint256 totalDebtValueRay;
        uint256 activeCollateralCount;
        uint256 borrowCount;
    }

    /// @notice Sub-Intent data to apply position manager update for user.
    /// @param positionManager The address of the position manager.
    /// @param approve True to approve the position manager, false to revoke approval.
    struct PositionManagerUpdate {
        address positionManager;
        bool approve;
    }

    /// @notice Intent data to set user position managers with EIP712-typed signature.
    /// @param onBehalfOf The address of the user on whose behalf position manager can act.
    /// @param updates The array of position manager updates.
    /// @param nonce The nonce for the signature.
    /// @param deadline The deadline for the signature.
    struct SetUserPositionManagers {
        address onBehalfOf;
        PositionManagerUpdate[] updates;
        uint256 nonce;
        uint256 deadline;
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
    /// @dev It reverts if the user would borrow more than the maximum allowed number of borrowed reserves.
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
    /// @dev It reverts if the user exceeds the maximum allowed collateral reserves when enabling.
    /// @dev Reserves with zero supplied or zero collateral factor count towards the max allowed collateral reserves.
    /// @dev Caller must be `onBehalfOf` or an authorized position manager for `onBehalfOf`.
    /// @param reserveId The reserve identifier of the underlying asset.
    /// @param usingAsCollateral True if the user wants to use the supply as collateral.
    /// @param onBehalfOf The owner of the position being modified.
    function setUsingAsCollateral(uint256 reserveId, bool usingAsCollateral, address onBehalfOf)
        external;

    /// @notice Allows updating the risk premium on onBehalfOf position.
    /// @dev Caller must be `onBehalfOf`, an authorized position manager for `onBehalfOf`, or admin.
    /// @param onBehalfOf The owner of the position being modified.
    function updateUserRiskPremium(address onBehalfOf) external;

    /// @notice Allows updating the dynamic configuration for all collateral reserves on onBehalfOf position.
    /// @dev Caller must be `onBehalfOf`, an authorized position manager for `onBehalfOf`, or admin.
    /// @param onBehalfOf The owner of the position being modified.
    function updateUserDynamicConfig(address onBehalfOf) external;

    /// @notice Enables a user to grant or revoke approval for a position manager.
    /// @dev Allows approving inactive position managers.
    /// @param positionManager The address of the position manager.
    /// @param approve True to approve the position manager, false to revoke approval.
    function setUserPositionManager(address positionManager, bool approve) external;

    /// @notice Enables a user to grant or revoke approval for an array of position managers using an EIP712-typed intent.
    /// @dev Uses keyed-nonces where for each key's namespace nonce is consumed sequentially.
    /// @dev Allows duplicated updates and the last one is persisted. Allows approving inactive position managers.
    /// @param params The structured setUserPositionManagers parameter.
    /// @param signature The EIP712-compliant signature bytes.
    function setUserPositionManagersWithSig(
        SetUserPositionManagers calldata params,
        bytes calldata signature
    ) external;

    /// @notice Allows position manager (as caller) to renounce their approval given by the user.
    /// @param user The address of the user.
    function renouncePositionManagerRole(address user) external;

    /// @notice Allows consuming a permit signature for the given reserve's underlying asset.
    /// @dev It reverts if the reserve associated with the given reserve identifier is not listed.
    /// @dev The Spoke must be configured as the spender.
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

    /// @notice Returns the liquidation config struct.
    function getLiquidationConfig() external view returns (LiquidationConfig memory);

    /// @notice Returns the number of listed reserves on the spoke.
    /// @dev Count includes reserves that are not currently active.
    function getReserveCount() external view returns (uint256);

    /// @notice Returns the reserve identifier for a given assetId in a Hub.
    /// @dev It reverts if no reserve is associated with the given assetId.
    /// @param hub The address of the Hub.
    /// @param assetId The identifier of the asset on the Hub.
    /// @return The identifier of the reserve.
    function getReserveId(address hub, uint256 assetId) external view returns (uint256);

    /// @notice Returns the reserve struct data in storage.
    /// @dev It reverts if the reserve associated with the given reserve identifier is not listed.
    /// @param reserveId The identifier of the reserve.
    /// @return The reserve struct.
    function getReserve(uint256 reserveId) external view returns (Reserve memory);

    /// @notice Returns the reserve configuration struct data in storage.
    /// @dev It reverts if the reserve associated with the given reserve identifier is not listed.
    /// @param reserveId The identifier of the reserve.
    /// @return The reserve configuration struct.
    function getReserveConfig(uint256 reserveId) external view returns (ReserveConfig memory);

    /// @notice Returns the dynamic reserve configuration struct at the specified key.
    /// @dev It reverts if the reserve associated with the given reserve identifier is not listed.
    /// @dev Does not revert if `dynamicConfigKey` is unset.
    /// @param reserveId The identifier of the reserve.
    /// @param dynamicConfigKey The key of the dynamic config.
    /// @return The dynamic reserve configuration struct.
    function getDynamicReserveConfig(uint256 reserveId, uint32 dynamicConfigKey)
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
    /// @return The user position struct.
    function getUserPosition(uint256 reserveId, address user)
        external
        view
        returns (UserPosition memory);

    /// @notice Returns the most up-to-date user account data information.
    /// @dev Utilizes user's current dynamic configuration of user position.
    /// @param user The address of the user.
    /// @return The user account data struct.
    function getUserAccountData(address user) external view returns (UserAccountData memory);

    /// @notice Returns the risk premium from the user's last position update.
    /// @param user The address of the user.
    /// @return The risk premium of the user from the last position update, expressed in BPS.
    function getUserLastRiskPremium(address user) external view returns (uint256);

    /// @notice Returns the liquidation bonus for a given health factor, based on the user's current dynamic configuration.
    /// @dev It reverts if the reserve associated with the given reserve identifier is not listed.
    /// @param reserveId The identifier of the reserve.
    /// @param user The address of the user.
    /// @param healthFactor The health factor of the user.
    function getLiquidationBonus(uint256 reserveId, address user, uint256 healthFactor)
        external
        view
        returns (uint256);

    /// @notice Returns whether positionManager is currently activated by governance.
    /// @param positionManager The address of the position manager.
    /// @return True if positionManager is currently active.
    function isPositionManagerActive(address positionManager) external view returns (bool);

    /// @notice Returns whether positionManager is active and approved by user.
    /// @param user The address of the user.
    /// @param positionManager The address of the position manager.
    /// @return True if positionManager is active and approved by user.
    function isPositionManager(address user, address positionManager) external view returns (bool);

    /// @notice Returns the address of the AaveOracle contract.
    function ORACLE() external view returns (address);

    /// @notice Returns the maximum allowed number of collateral and borrow reserves per user (each counted separately).
    function MAX_USER_RESERVES_LIMIT() external view returns (uint16);

    /// @notice Returns the EIP-712 domain separator.
    function DOMAIN_SEPARATOR() external view returns (bytes32);

    /// @notice Returns the type hash for the SetUserPositionManagers intent.
    /// @return The bytes-encoded EIP-712 struct hash representing the intent.
    function SET_USER_POSITION_MANAGERS_TYPEHASH() external view returns (bytes32);

    /// @notice Allows caller to revoke their next sequential nonce at specified `key`.
    /// @dev This does not invalidate nonce at other `key`s namespace.
    /// @param key The key which specifies namespace of the nonce.
    /// @return keyNonce The revoked key-prefixed nonce.
    function useNonce(uint192 key) external returns (uint256 keyNonce);

    /// @notice Returns the next unused nonce for an address and key. Result contains the key prefix.
    /// @param owner The address of the nonce owner.
    /// @param key The key which specifies namespace of the nonce.
    /// @return keyNonce The first 24 bytes are for the key, & the last 8 bytes for the nonce.
    function nonces(address owner, uint192 key) external view returns (uint256 keyNonce);

    function eip712Domain()
        external
        view
        returns (
            bytes1 fields,
            string memory name,
            string memory version,
            uint256 chainId,
            address verifyingContract,
            bytes32 salt,
            uint256[] memory extensions
        );
}
