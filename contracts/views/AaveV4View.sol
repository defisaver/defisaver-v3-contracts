// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ISpoke } from "../interfaces/protocols/aaveV4/ISpoke.sol";
import { IHub } from "../interfaces/protocols/aaveV4/IHub.sol";
import { IAaveV4Oracle } from "../interfaces/protocols/aaveV4/IAaveV4Oracle.sol";

/// @title Helper contract to aggregate data from AaveV4 protocol
contract AaveV4View {
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
    /// @dev reserveId The identifier of the reserve. Doesn't have to match the assetId in the Hub.
    /// @dev assetId The identifier of the asset in the Hub.
    /// @dev underlying The address of the underlying asset.
    /// @dev supplied The amount of supplied assets, expressed in asset units.
    /// @dev drawn The amount of user-drawn assets, expressed in asset units.
    /// @dev premium The amount of user-premium assets, expressed in asset units.
    /// @dev totalDebt The total amount of user-debt (drawn + premium), expressed in asset units.
    /// @dev collateralFactor The collateral factor of the reserve, expressed in BPS. (E.g 8500 = 85%).
    /// @dev maxLiquidationBonus The maximum extra amount of collateral given to the liquidator as bonus, expressed in BPS. 10000 represents 0.00% bonus. E.g 10500 = 5% bonus.
    /// @dev liquidationFee The protocol fee charged on liquidations, taken from the collateral bonus given to the liquidator, expressed in BPS. (E.g 1000 = 10%)
    /// @dev isUsingAsCollateral True if the reserve is being used as collateral.
    /// @dev isBorrowing True if the reserve is being borrowed.
    struct UserReserveData {
        uint256 reserveId;
        uint16 assetId;
        address underlying;
        uint256 supplied;
        uint256 drawn;
        uint256 premium;
        uint256 totalDebt;
        uint16 collateralFactor;
        uint32 maxLiquidationBonus;
        uint16 liquidationFee;
        bool isUsingAsCollateral;
        bool isBorrowing;
    }

    /// @notice Loan data with reserves data.
    /// @dev user The address of the user.
    /// @dev riskPremium The risk premium of the user position, expressed in BPS.
    /// @dev avgCollateralFactor The weighted average collateral factor of the user position, expressed in WAD.
    /// @dev healthFactor The health factor of the user position, expressed in WAD. 1e18 represents a health factor of 1.00.
    /// @dev totalCollateralInUsd The total collateral value of the user position, expressed in units of base currency. 1e26 represents 1 USD.
    /// @dev totalDebtInUsdRay The total debt value of the user position, expressed in units of base currency and scaled by RAY. 1e26 represents 1 USD.
    /// @dev activeCollateralCount The number of active collateral reserves.
    /// @dev borrowCount The number of borrowed reserves.
    /// @dev reserves The user's reserve data.
    struct LoanData {
        address user;
        uint256 riskPremium;
        uint256 avgCollateralFactor;
        uint256 healthFactor;
        uint256 totalCollateralInUsd;
        uint256 totalDebtInUsdRay;
        uint256 activeCollateralCount;
        uint256 borrowCount;
        UserReserveData[] reserves;
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
    /// @dev underlying The address of the underlying asset.
    /// @dev collateralFactor The collateral factor of the reserve, expressed in BPS. (E.g 8500 = 85%).
    /// @dev price The price of the underlying asset, expressed in oracle decimals.
    struct ReserveData {
        address underlying;
        uint16 collateralFactor;
        uint256 price;
    }

    /// @notice Full reserve data.
    /// @dev underlying The address of the underlying asset.
    /// @dev hub The address of the associated Hub.
    /// @dev assetId The identifier of the asset in the Hub.
    /// @dev decimals The number of decimals of the underlying asset.
    /// @dev paused True if all actions are prevented for the reserve.
    /// @dev frozen True if new activity is prevented for the reserve.
    /// @dev borrowable True if the reserve is borrowable.
    /// @dev collateralRisk The risk associated with a collateral asset, expressed in BPS. (E.g 1500 = 15%)
    /// @dev collateralFactor The collateral factor of the reserve, expressed in BPS. (E.g 8500 = 85%).
    /// @dev maxLiquidationBonus The maximum extra amount of collateral given to the liquidator as bonus, expressed in BPS. 10000 represents 0.00% bonus. E.g 10500 = 5% bonus.
    /// @dev liquidationFee The protocol fee charged on liquidations, taken from the collateral bonus given to the liquidator, expressed in BPS. (E.g 1000 = 10%)
    /// @dev price The price of the underlying asset, expressed in oracle decimals.
    /// @dev totalSupplied The total amount of spoke-supplied assets, expressed in asset units.
    /// @dev totalDrawn The total amount of spoke-drawn assets, expressed in asset units.
    /// @dev totalPremium The total amount of spoke-premium assets, expressed in asset units.
    /// @dev totalDebt The total amount of spoke-debt (drawn + premium), expressed in asset units.
    /// @dev supplyCap The supply cap of the spoke, expressed in asset units.
    /// @dev borrowCap The borrow cap of the spoke, expressed in asset units.
    /// @dev deficitRay The deficit reported by a spoke for a given asset, expressed in asset units and scaled by RAY.
    /// @dev spokeActive True if the spoke is active for this reserve.
    /// @dev spokeHalted True if the spoke is halted for this reserve.
    struct ReserveDataFull {
        address underlying;
        address hub;
        uint16 assetId;
        uint8 decimals;
        bool paused;
        bool frozen;
        bool borrowable;
        uint24 collateralRisk;
        uint16 collateralFactor;
        uint32 maxLiquidationBonus;
        uint16 liquidationFee;
        uint256 price;
        uint256 totalSupplied;
        uint256 totalDrawn;
        uint256 totalPremium;
        uint256 totalDebt;
        uint256 supplyCap;
        uint256 borrowCap;
        uint256 deficitRay;
        bool spokeActive;
        bool spokeHalted;
    }

    /// @notice Spoke data.
    /// @dev targetHealthFactor The ideal health factor to restore a user position during liquidation, expressed in WAD.
    /// @dev healthFactorForMaxBonus The health factor under which liquidation bonus is maximum, expressed in WAD.
    /// @dev liquidationBonusFactor The value multiplied by `maxLiquidationBonus` to compute the minimum liquidation bonus, expressed in BPS.
    /// @dev oracle The address of the oracle.
    /// @dev oracleDecimals The number of decimals of the oracle.
    /// @dev reserveCount The number of reserves in the spoke.
    struct SpokeData {
        uint128 targetHealthFactor;
        uint64 healthFactorForMaxBonus;
        uint16 liquidationBonusFactor;
        address oracle;
        uint256 oracleDecimals;
        uint256 reserveCount;
    }

    /// @notice Asset data from the Hub.
    /// @dev assetId The identifier of the asset in the Hub.
    /// @dev decimals The number of decimals of the underlying asset.
    /// @dev underlying The address of the underlying asset.
    /// @dev liquidity The liquidity available to be accessed, expressed in asset units.
    /// @dev totalSupplied The total amount of supplied assets, expressed in asset units.
    /// @dev totalDrawn The total amount of drawn assets, expressed in asset units.
    /// @dev totalPremium The total amount of premium assets, expressed in asset units.
    /// @dev totalDebt The total amount of debt (drawn + premium), expressed in asset units.
    /// @dev swept The outstanding liquidity which has been invested by the reinvestment controller, expressed in asset units.
    /// @dev liquidityFee The protocol fee charged on drawn and premium liquidity growth, expressed in BPS.
    /// @dev drawnIndex The drawn index which monotonically increases according to the drawn rate, expressed in RAY.
    /// @dev drawnRate The rate at which drawn assets grows, expressed in RAY.
    /// @dev lastUpdateTimestamp The timestamp of the last accrual.
    /// @dev irStrategy The address of the interest rate strategy.
    /// @dev reinvestmentController The address of the reinvestment controller.
    /// @dev feeReceiver The address of the fee receiver spoke.
    /// @dev deficitRay The amount of outstanding bad debt across all spokes, expressed in asset units and scaled by RAY.
    struct HubAssetData {
        uint16 assetId;
        uint8 decimals;
        address underlying;
        uint256 liquidity;
        uint256 totalSupplied;
        uint256 totalDrawn;
        uint256 totalPremium;
        uint256 totalDebt;
        uint256 swept;
        uint16 liquidityFee;
        uint120 drawnIndex;
        uint96 drawnRate;
        uint40 lastUpdateTimestamp;
        address irStrategy;
        address reinvestmentController;
        address feeReceiver;
        uint256 deficitRay;
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
