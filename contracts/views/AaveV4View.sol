// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ISpoke } from "../interfaces/protocols/aaveV4/ISpoke.sol";
import { IHub } from "../interfaces/protocols/aaveV4/IHub.sol";
import { ITokenizationSpoke } from "../interfaces/protocols/aaveV4/ITokenizationSpoke.sol";
import { IAaveV4Oracle } from "../interfaces/protocols/aaveV4/IAaveV4Oracle.sol";
import { IConfigPositionManager } from "../interfaces/protocols/aaveV4/IConfigPositionManager.sol";
import { ITakerPositionManager } from "../interfaces/protocols/aaveV4/ITakerPositionManager.sol";
import { IERC20 } from "../interfaces/token/IERC20.sol";

import { AaveV4Helper } from "../actions/aaveV4/helpers/AaveV4Helper.sol";

/// @title Helper contract to aggregate data from AaveV4 protocol
contract AaveV4View is AaveV4Helper {
    /**
     *
     *
     *
     *          DATA SPECIFICATION
     *
     *
     *
     */
    /// @notice User reserve data.
    struct UserReserveData {
        uint256 reserveId; // The identifier of the reserve. Doesn't have to match the assetId in the Hub.
        uint16 assetId; // The identifier of the asset in the Hub.
        address underlying; // The address of the underlying asset.
        uint256 supplied; // The amount of supplied assets, expressed in asset units.
        uint256 drawn; // The amount of user-drawn assets, expressed in asset units.
        uint256 premium; // The amount of user-premium assets, expressed in asset units.
        uint256 totalDebt; // The total amount of user-debt (drawn + premium), expressed in asset units.
        uint16 collateralFactor; // The collateral factor of the reserve, expressed in BPS. (E.g 8500 = 85%).
        uint32 maxLiquidationBonus; // The maximum extra amount of collateral given to the liquidator as bonus, expressed in BPS. 10000 represents 0.00% bonus. E.g 10500 = 5% bonus.
        uint16 liquidationFee; // The protocol fee charged on liquidations, taken from the collateral bonus given to the liquidator, expressed in BPS. (E.g 1000 = 10%)
        bool isUsingAsCollateral; // True if the reserve is being used as collateral.
        bool isBorrowing; // True if the reserve is being borrowed.
    }

    /// @notice Loan data with reserves data.
    struct LoanData {
        address user; // The address of the user.
        uint256 riskPremium; // The risk premium of the user position, expressed in BPS.
        uint256 avgCollateralFactor; // The weighted average collateral factor of the user position, expressed in WAD.
        uint256 healthFactor; // The health factor of the user position, expressed in WAD. 1e18 represents a health factor of 1.00.
        uint256 totalCollateralInUsd; // The total collateral value of the user position, expressed in units of base currency. 1e26 represents 1 USD.
        uint256 totalDebtInUsdRay; // The total debt value of the user position, expressed in units of base currency and scaled by RAY. 1e26 represents 1 USD.
        uint256 activeCollateralCount; // The number of active collateral reserves.
        uint256 borrowCount; // The number of borrowed reserves.
        UserReserveData[] reserves; // The user's reserve data.
    }

    /// @notice Same as regular UserReserveData, but with full reserve data
    struct UserReserveDataFull {
        uint256 reserveId; // The identifier of the reserve. Doesn't have to match the assetId in the Hub.
        address underlying; // The address of the underlying asset.
        uint256 price; // The price of the underlying asset, expressed in oracle decimals.
        uint8 decimals; // The number of decimals of the underlying asset.
        // --------------------------
        bool isUsingAsCollateral; // True if the reserve is being used as collateral.
        bool isBorrowing; // True if the reserve is being borrowed.
        bool reservePaused; // True if the reserve is paused for given spoke.
        bool reserveFrozen; // True if the reserve is frozen for given spoke.
        bool borrowable; // True if the reserve is borrowable.
        bool spokeActive; // True if the spoke is active for this reserve and hub.
        bool spokeHalted; // True if the spoke is halted for this reserve and hub.
        // --------------------------
        uint256 userSupplied; // The amount of user-supplied assets, expressed in asset units.
        uint256 userDrawn; // The amount of user-drawn assets, expressed in asset units.
        uint256 userPremium; // The amount of user-premium assets, expressed in asset units.
        uint256 userTotalDebt; // The total amount of user-debt (drawn + premium), expressed in asset units.
        // --------------------------
        uint24 collateralRisk; // The risk associated with a collateral asset, expressed in BPS. (E.g 1500 = 15%). This is global for spoke and reserveId.
        // --------------------------
        // This uses user dynamic config key
        uint16 userCollateralFactor; // The collateral factor of the user position, expressed in BPS. (E.g 8500 = 85%).
        uint32 userMaxLiquidationBonus; // The maximum extra amount of collateral given to the liquidator as bonus, expressed in BPS. 10000 represents 0.00% bonus. E.g 10500 = 5% bonus.
        uint16 userLiquidationFee; // The protocol fee charged on liquidations, taken from the collateral bonus given to the liquidator, expressed in BPS. (E.g 1000 = 10%)
        // --------------------------
        // This uses latest dynamic config key
        uint16 latestCollateralFactor; // The collateral factor of the reserve, expressed in BPS. (E.g 8500 = 85%).
        uint32 latestMaxLiquidationBonus; // The maximum extra amount of collateral given to the liquidator as bonus, expressed in BPS. 10000 represents 0.00% bonus. E.g 10500 = 5% bonus.
        uint16 latestLiquidationFee; // The protocol fee charged on liquidations, taken from the collateral bonus given to the liquidator, expressed in BPS. (E.g 1000 = 10%)
        // --------------------------
        address hub; // The address of the associated Hub.
        uint16 hubAssetId; // The identifier of the asset in the Hub.
        uint256 hubLiquidity; // The liquidity available to be accessed, expressed in asset units.
        uint96 drawnRate; // The rate at which drawn assets grows, expressed in RAY.
        uint120 drawnIndex; // The drawn index which monotonically increases according to the drawn rate, expressed in RAY.
        // --------------------------
        uint256 spokeTotalSupplied; // The total amount of spoke-supplied assets, expressed in asset units.
        uint256 spokeTotalDrawn; // The total amount of spoke-drawn assets, expressed in asset units.
        uint256 spokeTotalPremium; // The total amount of spoke-premium assets, expressed in asset units.
        uint256 spokeTotalDebt; // The total amount of spoke-debt (drawn + premium), expressed in asset units.
        // --------------------------
        uint256 spokeSupplyCap; // The supply cap of the spoke, expressed in asset units.
        uint256 spokeBorrowCap; // The borrow cap of the spoke, expressed in asset units.
        uint256 spokeDeficitRay; // The deficit reported by a spoke for a given asset, expressed in asset units and scaled by RAY.
    }

    /// @notice Same as regular LoanData, but with full reserves data
    struct LoanDataWithFullReserves {
        address user;
        uint256 riskPremium;
        uint256 avgCollateralFactor;
        uint256 healthFactor;
        uint256 totalCollateralInUsd;
        uint256 totalDebtInUsdRay;
        uint256 activeCollateralCount;
        uint256 borrowCount;
        UserReserveDataFull[] reserves;
    }

    /// @notice Minimal reserve data.
    struct ReserveData {
        address underlying; // The address of the underlying asset.
        uint16 collateralFactor; // The collateral factor of the reserve, expressed in BPS. (E.g 8500 = 85%).
        uint256 price; // The price of the underlying asset, expressed in oracle decimals.
    }

    /// @notice Full reserve data.
    struct ReserveDataFull {
        address underlying; // The address of the underlying asset.
        address hub; // The address of the associated Hub.
        uint16 assetId; // The identifier of the asset in the Hub.
        uint8 decimals; // The number of decimals of the underlying asset.
        bool paused; // True if all actions are prevented for the reserve.
        bool frozen; // True if new activity is prevented for the reserve.
        bool borrowable; // True if the reserve is borrowable.
        uint24 collateralRisk; // The risk associated with a collateral asset, expressed in BPS. (E.g 1500 = 15%)
        uint16 collateralFactor; // The collateral factor of the reserve, expressed in BPS. (E.g 8500 = 85%).
        uint32 maxLiquidationBonus; // The maximum extra amount of collateral given to the liquidator as bonus, expressed in BPS. 10000 represents 0.00% bonus. E.g 10500 = 5% bonus.
        uint16 liquidationFee; // The protocol fee charged on liquidations, taken from the collateral bonus given to the liquidator, expressed in BPS. (E.g 1000 = 10%)
        uint256 price; // The price of the underlying asset, expressed in oracle decimals.
        uint256 totalSupplied; // The total amount of spoke-supplied assets, expressed in asset units.
        uint256 totalDrawn; // The total amount of spoke-drawn assets, expressed in asset units.
        uint256 totalPremium; // The total amount of spoke-premium assets, expressed in asset units.
        uint256 totalDebt; // The total amount of spoke-debt (drawn + premium), expressed in asset units.
        uint256 supplyCap; // The supply cap of the spoke, expressed in asset units.
        uint256 borrowCap; // The borrow cap of the spoke, expressed in asset units.
        uint256 deficitRay; // The deficit reported by a spoke for a given asset, expressed in asset units and scaled by RAY.
        bool spokeActive; // True if the spoke is active for this reserve.
        bool spokeHalted; // True if the spoke is halted for this reserve.
    }

    /// @notice Spoke data.
    struct SpokeData {
        uint128 targetHealthFactor; // The ideal health factor to restore a user position during liquidation, expressed in WAD.
        uint64 healthFactorForMaxBonus; // The health factor under which liquidation bonus is maximum, expressed in WAD.
        uint16 liquidationBonusFactor; // The value multiplied by `maxLiquidationBonus` to compute the minimum liquidation bonus, expressed in BPS.
        address oracle; // The address of the oracle.
        uint256 oracleDecimals; // The number of decimals of the oracle.
        uint256 reserveCount; // The number of reserves in the spoke.
    }

    /// @notice Asset data from the Hub.
    struct HubAssetData {
        uint16 assetId; // The identifier of the asset in the Hub.
        uint8 decimals; // The number of decimals of the underlying asset.
        address underlying; // The address of the underlying asset.
        uint256 liquidity; // The liquidity available to be accessed, expressed in asset units.
        uint256 totalSupplied; // The total amount of spoke-supplied assets, expressed in asset units.
        uint256 totalDrawn; // The total amount of drawn assets, expressed in asset units.
        uint256 totalPremium; // The total amount of premium assets, expressed in asset units.
        uint256 totalDebt; // The total amount of debt (drawn + premium), expressed in asset units.
        uint256 swept; // The outstanding liquidity which has been invested by the reinvestment controller, expressed in asset units.
        uint16 liquidityFee; // The protocol fee charged on drawn and premium liquidity growth, expressed in BPS.
        uint120 drawnIndex; // The drawn index which monotonically increases according to the drawn rate, expressed in RAY.
        uint96 drawnRate; // The rate at which drawn assets grows, expressed in RAY.
        uint40 lastUpdateTimestamp; // The timestamp of the last accrual.
        address irStrategy; // The address of the interest rate strategy.
        address reinvestmentController; // The address of the reinvestment controller.
        address feeReceiver; // The address of the fee receiver spoke.
        uint256 deficitRay; // The amount of outstanding bad debt across all spokes, expressed in asset units and scaled by RAY.
    }

    /// @notice EOA reserve approval data.
    struct EOAReserveApprovalData {
        uint256 reserveId; // The identifier of the reserve.
        address underlying; // The address of the underlying asset.
        uint256 delegateeBorrowApproval; // The approval of the delegatee to borrow on behalf of the user.
        uint256 delegateeWithdrawApproval; // The approval of the delegatee to withdraw on behalf of the user.
        uint256 eoaReserveBalance; // The EOA's balance of the reserve.
    }

    /// @notice EOA approval data.
    struct EOAApprovalData {
        address eoa; // The address of the EOA.
        address proxy; // The address of the proxy which acts on behalf of the EOA (delegatee).
        address spoke; // The address of the spoke.
        // --------------------------
        bool giverPositionManagerEnabled; // True if the supply/payback manager is enabled globally for the user.
        bool takerPositionManagerEnabled; // True if the withdraw/borrow manager is enabled globally for the user.
        bool configPositionManagerEnabled; // True if the config manager is enabled globally for the user.
        // --------------------------
        bool canSetUsingAsCollateral; // True if the delegatee can set using as collateral on behalf of the user.
        bool canUpdateUserRiskPremium; // True if the delegatee can update user risk premium on behalf of the user.
        bool canUpdateUserDynamicConfig; // True if the delegatee can update user dynamic config on behalf of the user.
        // --------------------------
        EOAReserveApprovalData[] reserveApprovals; // The approval data for each reserve inside the spoke.
    }

    /// @notice Tokenization spoke data with optional user data.
    /// @dev Tokenization spoke is ERC4626 compliant wrapper to tokenize one listed asset of the connected Hub.
    struct TokenizationSpokeData {
        // ---- Asset ----
        address underlyingAsset; // The address of the underlying asset.
        uint256 assetId; // The identifier of the asset in the Hub.
        uint8 decimals; // The number of decimals of the underlying asset.
        // ---- Spoke ----
        address spoke; // The address of the spoke.
        bool spokeActive; // True if the spoke is active.
        bool spokeHalted; // True if the spoke is halted.
        uint256 spokeDepositCap; // The deposit cap of the spoke, expressed in asset units.
        uint256 spokeTotalAssets; // The total amount of spoke-supplied assets, expressed in asset units.
        uint256 spokeTotalShares; // The total amount of spoke-supplied shares, expressed in shares.
        // ---- Hub ----
        address hub; // The address of the associated Hub.
        uint256 hubLiquidity; // The liquidity available to be accessed, expressed in asset units.
        uint96 hubDrawnRate; // The rate at which drawn assets grows, expressed in RAY.
        uint256 convertToShares; // The conversion rate from assets to shares expressed in asset units.
        uint256 convertToAssets; // The conversion rate from shares to assets expressed in asset units.
        // ---- User ---- (Optional)
        address user; // The address of the user.
        uint256 userSuppliedAssets; // The amount of user-supplied assets, expressed in asset units.
        uint256 userSuppliedShares; // The amount of user-supplied shares, expressed in asset units.
    }

    /**
     *
     *
     *
     *          EXTERNAL FUNCTIONS
     *
     *
     *
     */

    function getReserveData(address _spoke, uint256 _reserveId)
        external
        view
        returns (ReserveData memory reserveData)
    {
        return _getReserveData(_spoke, _reserveId);
    }

    function getReservesData(address _spoke, uint256[] calldata _reserveIds)
        external
        view
        returns (ReserveData[] memory reserveData)
    {
        reserveData = new ReserveData[](_reserveIds.length);
        for (uint256 i = 0; i < _reserveIds.length; ++i) {
            reserveData[i] = _getReserveData(_spoke, _reserveIds[i]);
        }
    }

    function getReserveDataFull(address _spoke, uint256 _reserveId)
        external
        view
        returns (ReserveDataFull memory reserveData)
    {
        return _getReserveDataFull(_spoke, _reserveId);
    }

    function getReservesDataFull(address _spoke, uint256[] calldata _reserveIds)
        external
        view
        returns (ReserveDataFull[] memory reserveData)
    {
        reserveData = new ReserveDataFull[](_reserveIds.length);
        for (uint256 i = 0; i < _reserveIds.length; ++i) {
            reserveData[i] = _getReserveDataFull(_spoke, _reserveIds[i]);
        }
    }

    function getSpokeData(address _spoke)
        external
        view
        returns (SpokeData memory spokeData, ReserveData[] memory reserves)
    {
        spokeData = _getSpokeData(_spoke);
        reserves = new ReserveData[](spokeData.reserveCount);
        for (uint256 i = 0; i < spokeData.reserveCount; ++i) {
            reserves[i] = _getReserveData(_spoke, i);
        }
    }

    function getSpokeDataFull(address _spoke)
        external
        view
        returns (SpokeData memory spokeData, ReserveDataFull[] memory reserves)
    {
        spokeData = _getSpokeData(_spoke);
        reserves = new ReserveDataFull[](spokeData.reserveCount);
        for (uint256 i = 0; i < spokeData.reserveCount; ++i) {
            reserves[i] = _getReserveDataFull(_spoke, i);
        }
    }

    function getLoanData(address _spoke, address _user)
        public
        view
        returns (LoanData memory loanData)
    {
        ISpoke spoke = ISpoke(_spoke);

        ISpoke.UserAccountData memory userAccountData = spoke.getUserAccountData(_user);
        uint256 reserveCount = spoke.getReserveCount();

        loanData = LoanData({
            user: _user,
            riskPremium: userAccountData.riskPremium,
            avgCollateralFactor: userAccountData.avgCollateralFactor,
            healthFactor: userAccountData.healthFactor,
            totalCollateralInUsd: userAccountData.totalCollateralValue,
            totalDebtInUsdRay: userAccountData.totalDebtValueRay,
            activeCollateralCount: userAccountData.activeCollateralCount,
            borrowCount: userAccountData.borrowCount,
            reserves: new UserReserveData[](reserveCount)
        });

        for (uint256 i = 0; i < reserveCount; ++i) {
            loanData.reserves[i] = _getUserReserveData(_spoke, _user, i);
        }
    }

    function getLoanDataFull(address _spoke, address _user)
        public
        view
        returns (LoanDataWithFullReserves memory loanData)
    {
        ISpoke spoke = ISpoke(_spoke);

        ISpoke.UserAccountData memory userAccountData = spoke.getUserAccountData(_user);
        uint256 reserveCount = spoke.getReserveCount();

        loanData = LoanDataWithFullReserves({
            user: _user,
            riskPremium: userAccountData.riskPremium,
            avgCollateralFactor: userAccountData.avgCollateralFactor,
            healthFactor: userAccountData.healthFactor,
            totalCollateralInUsd: userAccountData.totalCollateralValue,
            totalDebtInUsdRay: userAccountData.totalDebtValueRay,
            activeCollateralCount: userAccountData.activeCollateralCount,
            borrowCount: userAccountData.borrowCount,
            reserves: new UserReserveDataFull[](reserveCount)
        });

        for (uint256 i = 0; i < reserveCount; ++i) {
            loanData.reserves[i] = _getUserReserveDataFull(_spoke, _user, i);
        }
    }

    function getLoanDataForMultipleSpokes(address _user, address[] calldata _spokes)
        public
        view
        returns (LoanData[] memory loans)
    {
        loans = new LoanData[](_spokes.length);
        for (uint256 i = 0; i < _spokes.length; ++i) {
            loans[i] = getLoanData(_spokes[i], _user);
        }
    }

    function getLoanDataForMultipleUsers(address _spoke, address[] calldata _users)
        public
        view
        returns (LoanData[] memory loans)
    {
        loans = new LoanData[](_users.length);

        for (uint256 i = 0; i < _users.length; ++i) {
            loans[i] = getLoanData(_spoke, _users[i]);
        }
    }

    function getReservePrices(address _spoke, uint256[] calldata _reserveIds)
        public
        view
        returns (uint256[] memory prices)
    {
        prices = IAaveV4Oracle(ISpoke(_spoke).ORACLE()).getReservesPrices(_reserveIds);
    }

    function getReservePrice(address _spoke, uint256 _reserveId)
        public
        view
        returns (uint256 price)
    {
        price = IAaveV4Oracle(ISpoke(_spoke).ORACLE()).getReservePrice(_reserveId);
    }

    function getHealthFactor(address _spoke, address _user)
        public
        view
        returns (uint256 healthFactor)
    {
        return ISpoke(_spoke).getUserAccountData(_user).healthFactor;
    }

    function getUserReserveData(address _spoke, address _user, uint256[] calldata _reserveIds)
        public
        view
        returns (UserReserveData[] memory _userReserves)
    {
        _userReserves = new UserReserveData[](_reserveIds.length);
        for (uint256 i = 0; i < _reserveIds.length; ++i) {
            _userReserves[i] = _getUserReserveData(_spoke, _user, _reserveIds[i]);
        }
    }

    function getHubAssetData(address _hub, uint256 _assetId)
        public
        view
        returns (HubAssetData memory hubAssetData)
    {
        return _getHubAssetData(_hub, _assetId);
    }

    function getHubAllAssetsData(address _hub)
        public
        view
        returns (HubAssetData[] memory hubAssetData)
    {
        uint256 assetCount = IHub(_hub).getAssetCount();
        hubAssetData = new HubAssetData[](assetCount);
        for (uint256 i = 0; i < assetCount; ++i) {
            hubAssetData[i] = _getHubAssetData(_hub, i);
        }
    }

    function getSpokesForAsset(address _hub, uint256 _assetId)
        public
        view
        returns (address[] memory spokes)
    {
        IHub hub = IHub(_hub);
        uint256 spokeCount = hub.getSpokeCount(_assetId);
        spokes = new address[](spokeCount);
        for (uint256 i = 0; i < spokeCount; ++i) {
            spokes[i] = hub.getSpokeAddress(_assetId, i);
        }
    }

    function getEOAApprovalsAndBalances(address _eoa, address _proxy, address _spoke)
        public
        view
        returns (EOAApprovalData memory data)
    {
        ISpoke spoke = ISpoke(_spoke);
        uint256 reserveCount = spoke.getReserveCount();

        data.eoa = _eoa;
        data.proxy = _proxy;
        data.spoke = _spoke;

        data.giverPositionManagerEnabled = spoke.isPositionManager(_eoa, GIVER_POSITION_MANAGER);
        data.takerPositionManagerEnabled = spoke.isPositionManager(_eoa, TAKER_POSITION_MANAGER);
        data.configPositionManagerEnabled = spoke.isPositionManager(_eoa, CONFIG_POSITION_MANAGER);

        IConfigPositionManager.ConfigPermissionValues memory configPerms = IConfigPositionManager(
                CONFIG_POSITION_MANAGER
            ).getConfigPermissions(_spoke, _proxy, _eoa);
        data.canSetUsingAsCollateral = configPerms.canSetUsingAsCollateral;
        data.canUpdateUserRiskPremium = configPerms.canUpdateUserRiskPremium;
        data.canUpdateUserDynamicConfig = configPerms.canUpdateUserDynamicConfig;

        data.reserveApprovals = new EOAReserveApprovalData[](reserveCount);
        ITakerPositionManager takerPM = ITakerPositionManager(TAKER_POSITION_MANAGER);

        for (uint256 i = 0; i < reserveCount; ++i) {
            ISpoke.Reserve memory reserve = spoke.getReserve(i);
            data.reserveApprovals[i] = EOAReserveApprovalData({
                reserveId: i,
                underlying: reserve.underlying,
                delegateeBorrowApproval: takerPM.borrowAllowance(_spoke, i, _eoa, _proxy),
                delegateeWithdrawApproval: takerPM.withdrawAllowance(_spoke, i, _eoa, _proxy),
                eoaReserveBalance: IERC20(reserve.underlying).balanceOf(_eoa)
            });
        }
    }

    function getTokenizationSpokesData(address[] calldata _spokes, address _user)
        public
        view
        returns (TokenizationSpokeData[] memory spokeData)
    {
        spokeData = new TokenizationSpokeData[](_spokes.length);
        for (uint256 i = 0; i < _spokes.length; ++i) {
            spokeData[i] = getTokenizationSpokeData(_spokes[i], _user);
        }
    }

    function getTokenizationSpokeData(address _spoke, address _user)
        public
        view
        returns (TokenizationSpokeData memory spokeData)
    {
        ITokenizationSpoke ts = ITokenizationSpoke(_spoke);
        spokeData.spoke = _spoke;
        spokeData.hub = ts.hub();
        spokeData.assetId = ts.assetId();

        IHub.Asset memory hubAsset = IHub(spokeData.hub).getAsset(spokeData.assetId);
        IHub.SpokeConfig memory tsConfig =
            IHub(spokeData.hub).getSpokeConfig(spokeData.assetId, _spoke);

        spokeData.underlyingAsset = hubAsset.underlying;
        spokeData.decimals = hubAsset.decimals;
        spokeData.spokeTotalAssets = ts.totalAssets();
        spokeData.spokeTotalShares = ts.totalSupply();
        spokeData.spokeActive = tsConfig.active;
        spokeData.spokeHalted = tsConfig.halted;
        spokeData.spokeDepositCap = tsConfig.addCap != IHub(spokeData.hub).MAX_ALLOWED_SPOKE_CAP()
            ? tsConfig.addCap * (10 ** spokeData.decimals)
            : type(uint256).max;
        spokeData.hubLiquidity = hubAsset.liquidity;
        spokeData.hubDrawnRate = hubAsset.drawnRate;
        spokeData.convertToShares = ts.convertToShares(10 ** spokeData.decimals);
        spokeData.convertToAssets = ts.convertToAssets(10 ** spokeData.decimals);
        spokeData.user = _user;
        spokeData.userSuppliedShares = IERC20(_spoke).balanceOf(_user);
        spokeData.userSuppliedAssets = ts.convertToAssets(spokeData.userSuppliedShares);
    }

    /**
     *
     *
     *
     *          INTERNAL FUNCTIONS
     *
     *
     *
     */
    function _getReserveData(address _spoke, uint256 _reserveId)
        internal
        view
        returns (ReserveData memory reserveData)
    {
        ISpoke spoke = ISpoke(_spoke);
        ISpoke.Reserve memory reserve = spoke.getReserve(_reserveId);
        ISpoke.DynamicReserveConfig memory config =
            spoke.getDynamicReserveConfig(_reserveId, reserve.dynamicConfigKey);
        reserveData = ReserveData({
            underlying: reserve.underlying,
            collateralFactor: config.collateralFactor,
            price: getReservePrice(_spoke, _reserveId)
        });
    }

    function _getReserveDataFull(address _spoke, uint256 _reserveId)
        internal
        view
        returns (ReserveDataFull memory reserveData)
    {
        ISpoke.Reserve memory reserve = ISpoke(_spoke).getReserve(_reserveId);
        ISpoke.ReserveConfig memory reserveConfig = ISpoke(_spoke).getReserveConfig(_reserveId);
        ISpoke.DynamicReserveConfig memory dynamicReserveConfig =
            ISpoke(_spoke).getDynamicReserveConfig(_reserveId, reserve.dynamicConfigKey);

        IHub.SpokeData memory spokeData = IHub(reserve.hub).getSpoke(reserve.assetId, _spoke);
        (uint256 totalDrawn, uint256 totalPremium) =
            IHub(reserve.hub).getSpokeOwed(reserve.assetId, _spoke);
        uint256 maxCap = IHub(reserve.hub).MAX_ALLOWED_SPOKE_CAP();

        reserveData = ReserveDataFull({
            underlying: reserve.underlying,
            hub: reserve.hub,
            assetId: reserve.assetId,
            decimals: reserve.decimals,
            paused: reserveConfig.paused,
            frozen: reserveConfig.frozen,
            borrowable: reserveConfig.borrowable,
            collateralRisk: reserve.collateralRisk,
            collateralFactor: dynamicReserveConfig.collateralFactor,
            maxLiquidationBonus: dynamicReserveConfig.maxLiquidationBonus,
            liquidationFee: dynamicReserveConfig.liquidationFee,
            price: getReservePrice(_spoke, _reserveId),
            totalSupplied: IHub(reserve.hub).getSpokeAddedAssets(reserve.assetId, _spoke),
            totalDrawn: totalDrawn,
            totalPremium: totalPremium,
            totalDebt: totalDrawn + totalPremium,
            supplyCap: spokeData.addCap != maxCap
                ? spokeData.addCap * (10 ** reserve.decimals)
                : type(uint256).max,
            borrowCap: spokeData.drawCap != maxCap
                ? spokeData.drawCap * (10 ** reserve.decimals)
                : type(uint256).max,
            deficitRay: spokeData.deficitRay,
            spokeActive: spokeData.active,
            spokeHalted: spokeData.halted
        });
    }

    function _getUserReserveData(address _spoke, address _user, uint256 _reserveId)
        internal
        view
        returns (UserReserveData memory)
    {
        ISpoke spoke = ISpoke(_spoke);
        ISpoke.Reserve memory reserve = spoke.getReserve(_reserveId);
        ISpoke.DynamicReserveConfig memory config = spoke.getDynamicReserveConfig(
            _reserveId, spoke.getUserPosition(_reserveId, _user).dynamicConfigKey
        );

        (uint256 drawn, uint256 premium) = spoke.getUserDebt(_reserveId, _user);
        (bool isUsingAsCollateral, bool isBorrowing) = spoke.getUserReserveStatus(_reserveId, _user);

        return UserReserveData({
            reserveId: _reserveId,
            assetId: reserve.assetId,
            underlying: reserve.underlying,
            supplied: spoke.getUserSuppliedAssets(_reserveId, _user),
            drawn: drawn,
            premium: premium,
            totalDebt: drawn + premium,
            collateralFactor: config.collateralFactor,
            maxLiquidationBonus: config.maxLiquidationBonus,
            liquidationFee: config.liquidationFee,
            isUsingAsCollateral: isUsingAsCollateral,
            isBorrowing: isBorrowing
        });
    }

    function _getUserReserveDataFull(address _spoke, address _user, uint256 _reserveId)
        internal
        view
        returns (UserReserveDataFull memory data)
    {
        ISpoke spoke = ISpoke(_spoke);
        ISpoke.Reserve memory reserve = spoke.getReserve(_reserveId);
        ISpoke.ReserveConfig memory reserveConfig = spoke.getReserveConfig(_reserveId);

        data.reserveId = _reserveId;
        data.underlying = reserve.underlying;
        data.price = getReservePrice(_spoke, _reserveId);
        data.decimals = reserve.decimals;

        data.reservePaused = reserveConfig.paused;
        data.reserveFrozen = reserveConfig.frozen;
        data.borrowable = reserveConfig.borrowable;

        data.userSupplied = spoke.getUserSuppliedAssets(_reserveId, _user);
        (data.userDrawn, data.userPremium) = spoke.getUserDebt(_reserveId, _user);
        data.userTotalDebt = data.userDrawn + data.userPremium;

        (data.isUsingAsCollateral, data.isBorrowing) = spoke.getUserReserveStatus(_reserveId, _user);

        data.collateralRisk = reserve.collateralRisk;

        {
            uint32 userKey = spoke.getUserPosition(_reserveId, _user).dynamicConfigKey;
            ISpoke.DynamicReserveConfig memory userCfg =
                spoke.getDynamicReserveConfig(_reserveId, userKey);
            data.userCollateralFactor = userCfg.collateralFactor;
            data.userMaxLiquidationBonus = userCfg.maxLiquidationBonus;
            data.userLiquidationFee = userCfg.liquidationFee;
        }

        {
            ISpoke.DynamicReserveConfig memory latestCfg =
                spoke.getDynamicReserveConfig(_reserveId, reserve.dynamicConfigKey);
            data.latestCollateralFactor = latestCfg.collateralFactor;
            data.latestMaxLiquidationBonus = latestCfg.maxLiquidationBonus;
            data.latestLiquidationFee = latestCfg.liquidationFee;
        }

        data.hub = reserve.hub;
        data.hubAssetId = reserve.assetId;

        data.hubLiquidity = IHub(data.hub).getAssetLiquidity(reserve.assetId);
        data.drawnRate = uint96(IHub(data.hub).getAssetDrawnRate(reserve.assetId));
        data.drawnIndex = uint120(IHub(data.hub).getAssetDrawnIndex(reserve.assetId));

        data.spokeTotalSupplied = IHub(data.hub).getSpokeAddedAssets(reserve.assetId, _spoke);
        (data.spokeTotalDrawn, data.spokeTotalPremium) =
            IHub(data.hub).getSpokeOwed(reserve.assetId, _spoke);
        data.spokeTotalDebt = data.spokeTotalDrawn + data.spokeTotalPremium;

        {
            IHub.SpokeData memory hubSpokeData = IHub(data.hub).getSpoke(reserve.assetId, _spoke);
            data.spokeActive = hubSpokeData.active;
            data.spokeHalted = hubSpokeData.halted;
            data.spokeDeficitRay = hubSpokeData.deficitRay;

            uint40 maxCap = IHub(data.hub).MAX_ALLOWED_SPOKE_CAP();
            data.spokeSupplyCap = hubSpokeData.addCap != maxCap
                ? uint256(hubSpokeData.addCap) * (10 ** reserve.decimals)
                : type(uint256).max;
            data.spokeBorrowCap = hubSpokeData.drawCap != maxCap
                ? uint256(hubSpokeData.drawCap) * (10 ** reserve.decimals)
                : type(uint256).max;
        }
    }

    function _getSpokeData(address _spoke) internal view returns (SpokeData memory spokeData) {
        ISpoke spoke = ISpoke(_spoke);
        ISpoke.LiquidationConfig memory liqConfig = spoke.getLiquidationConfig();
        address oracle = spoke.ORACLE();
        spokeData = SpokeData({
            targetHealthFactor: liqConfig.targetHealthFactor,
            healthFactorForMaxBonus: liqConfig.healthFactorForMaxBonus,
            liquidationBonusFactor: liqConfig.liquidationBonusFactor,
            oracle: oracle,
            oracleDecimals: IAaveV4Oracle(oracle).DECIMALS(),
            reserveCount: spoke.getReserveCount()
        });
    }

    function _getHubAssetData(address _hub, uint256 _assetId)
        internal
        view
        returns (HubAssetData memory hubAssetData)
    {
        IHub hub = IHub(_hub);
        IHub.Asset memory asset = hub.getAsset(_assetId);

        (uint256 totalDrawn, uint256 totalPremium) = hub.getAssetOwed(_assetId);

        hubAssetData = HubAssetData({
            assetId: uint16(_assetId),
            decimals: asset.decimals,
            underlying: asset.underlying,
            liquidity: asset.liquidity,
            totalSupplied: hub.getAddedAssets(_assetId),
            totalDrawn: totalDrawn,
            totalPremium: totalPremium,
            totalDebt: totalDrawn + totalPremium,
            swept: asset.swept,
            liquidityFee: asset.liquidityFee,
            drawnIndex: asset.drawnIndex,
            drawnRate: asset.drawnRate,
            lastUpdateTimestamp: asset.lastUpdateTimestamp,
            irStrategy: asset.irStrategy,
            reinvestmentController: asset.reinvestmentController,
            feeReceiver: asset.feeReceiver,
            deficitRay: asset.deficitRay
        });
    }
}
