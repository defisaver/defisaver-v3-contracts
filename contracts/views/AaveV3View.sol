// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../actions/aaveV3/helpers/AaveV3Helper.sol";
import "../actions/aaveV3/helpers/AaveV3RatioHelper.sol";
import "../utils/TokenUtils.sol";
import "../interfaces/aaveV3/IAaveV3Oracle.sol";

contract AaveV3View is AaveV3Helper, AaveV3RatioHelper {
    uint256 internal constant BORROW_CAP_MASK =                0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF000000000FFFFFFFFFFFFFFFFFFFF; // prettier-ignore
    uint256 internal constant SUPPLY_CAP_MASK =                0xFFFFFFFFFFFFFFFFFFFFFFFFFF000000000FFFFFFFFFFFFFFFFFFFFFFFFFFFFF; // prettier-ignore
    uint256 internal constant EMODE_CATEGORY_MASK =            0xFFFFFFFFFFFFFFFFFFFF00FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF; // prettier-ignore
    uint256 internal constant BORROWABLE_IN_ISOLATION_MASK =   0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFDFFFFFFFFFFFFFFF; // prettier-ignore
    uint256 internal constant BORROWING_MASK =                 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFBFFFFFFFFFFFFFF; // prettier-ignore
    uint256 internal constant STABLE_BORROWING_MASK =          0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF7FFFFFFFFFFFFFF; // prettier-ignore
    uint256 internal constant LTV_MASK =                       0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF0000; // prettier-ignore
    uint256 internal constant RESERVE_FACTOR_MASK =            0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF0000FFFFFFFFFFFFFFFF; // prettier-ignore
    uint256 internal constant LIQUIDATION_THRESHOLD_MASK =     0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF0000FFFF; // prettier-ignore
    uint256 internal constant DEBT_CEILING_MASK =              0xF0000000000FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF; // prettier-ignore
    uint256 internal constant FLASHLOAN_ENABLED_MASK =         0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF7FFFFFFFFFFFFFFF; // prettier-ignore

    
    uint256 internal constant LIQUIDATION_THRESHOLD_START_BIT_POSITION = 16;
    uint256 internal constant RESERVE_FACTOR_START_BIT_POSITION = 64;
    uint256 internal constant BORROWING_ENABLED_START_BIT_POSITION = 58;
    uint256 internal constant STABLE_BORROWING_ENABLED_START_BIT_POSITION = 59;
    uint256 internal constant BORROW_CAP_START_BIT_POSITION = 80;
    uint256 internal constant SUPPLY_CAP_START_BIT_POSITION = 116;
    uint256 internal constant EMODE_CATEGORY_START_BIT_POSITION = 168;
    uint256 internal constant DEBT_CEILING_START_BIT_POSITION = 212;
    uint256 internal constant FLASHLOAN_ENABLED_START_BIT_POSITION = 63;

    using TokenUtils for address;

    struct LoanData {
        address user;
        uint128 ratio;
        uint256 eMode;
        address[] collAddr;
        address[] borrowAddr;
        uint256[] collAmounts;
        uint256[] borrowStableAmounts;
        uint256[] borrowVariableAmounts;
        // emode category data
        uint16 ltv;
        uint16 liquidationThreshold;
        uint16 liquidationBonus;
        address priceSource;
        string label;
    }

    struct UserToken {
        address token;
        uint256 balance;
        uint256 borrowsStable;
        uint256 borrowsVariable;
        uint256 stableBorrowRate;
        bool enabledAsCollateral;
    }

    struct TokenInfo {
        address aTokenAddress;
        address underlyingTokenAddress;
        uint256 collateralFactor;
        uint256 price;
    }

    struct TokenInfoFull {
        address aTokenAddress; //pool.config
        address underlyingTokenAddress; //pool.config
        uint16 assetId;
        uint256 supplyRate; //pool.config
        uint256 borrowRateVariable; //pool.config
        uint256 borrowRateStable; //pool.config
        uint256 totalSupply; //total supply
        uint256 availableLiquidity; //reserveData.liq rate
        uint256 totalBorrow; // total supply of both debt assets
        uint256 totalBorrowVar;
        uint256 totalBorrowStab;
        uint256 collateralFactor; //pool.config
        uint256 liquidationRatio; //pool.config
        uint256 price; //oracle
        uint256 supplyCap; //pool.config
        uint256 borrowCap; //pool.config
        uint256 emodeCategory; //pool.config
        uint256 debtCeilingForIsolationMode; //pool.config 212-251
        uint256 isolationModeTotalDebt; //pool.isolationModeTotalDebt
        bool usageAsCollateralEnabled; //usageAsCollateralEnabled = liquidationThreshold > 0;
        bool borrowingEnabled; //pool.config
        bool stableBorrowRateEnabled; //pool.config
        bool isolationModeBorrowingEnabled; //pool.config
        bool isSiloedForBorrowing; //AaveProtocolDataProvider.getSiloedBorrowing
        uint256 eModeCollateralFactor; //pool.getEModeCategoryData.ltv
        bool isFlashLoanEnabled;
    }

    function getHealthFactor(address _market, address _user)
        public
        view
        returns (uint256 healthFactor)
    {
        IPoolV3 lendingPool = getLendingPool(_market);

        (, , , , , healthFactor) = lendingPool.getUserAccountData(_user);
    }

    /// @notice Fetches Aave prices for tokens
    /// @param _market Address of LendingPoolAddressesProvider for specific market
    /// @param _tokens Arr. of tokens for which to get the prices
    /// @return prices Array of prices
    function getPrices(address _market, address[] memory _tokens)
        public
        view
        returns (uint256[] memory prices)
    {
        address priceOracleAddress = IPoolAddressesProvider(_market).getPriceOracle();
        prices = IAaveV3Oracle(priceOracleAddress).getAssetsPrices(_tokens);
    }

    /// @notice Calculated the ratio of coll/debt for an aave user
    /// @param _market Address of LendingPoolAddressesProvider for specific market
    /// @param _users Addresses of the user
    /// @return ratios Array of ratios
    function getRatios(address _market, address[] memory _users)
        public
        view
        returns (uint256[] memory ratios)
    {
        ratios = new uint256[](_users.length);

        for (uint256 i = 0; i < _users.length; ++i) {
            ratios[i] = getSafetyRatio(_market, _users[i]);
        }
    }

    /// @notice Fetches Aave collateral factors for tokens
    /// @param _market Address of LendingPoolAddressesProvider for specific market
    /// @param _tokens Arr. of tokens for which to get the coll. factors
    /// @return collFactors Array of coll. factors
    function getCollFactors(address _market, address[] memory _tokens)
        public
        view
        returns (uint256[] memory collFactors)
    {
        IPoolV3 lendingPool = getLendingPool(_market);
        collFactors = new uint256[](_tokens.length);

        for (uint256 i = 0; i < _tokens.length; ++i) {
            DataTypes.ReserveConfigurationMap memory config = lendingPool.getConfiguration(
                _tokens[i]
            );
            collFactors[i] = getReserveFactor(config);
        }
    }

    function getTokenBalances(
        address _market,
        address _user,
        address[] memory _tokens
    ) public view returns (UserToken[] memory userTokens) {
        IPoolV3 lendingPool = getLendingPool(_market);
        userTokens = new UserToken[](_tokens.length);

        for (uint256 i = 0; i < _tokens.length; i++) {
            DataTypes.ReserveData memory reserveData = lendingPool.getReserveData(_tokens[i]);
            userTokens[i].balance = reserveData.aTokenAddress.getBalance(_user);
            userTokens[i].borrowsStable = reserveData.stableDebtTokenAddress.getBalance(_user);
            userTokens[i].borrowsVariable = reserveData.variableDebtTokenAddress.getBalance(_user);
            userTokens[i].stableBorrowRate = reserveData.currentStableBorrowRate;
            DataTypes.UserConfigurationMap memory map = lendingPool.getUserConfiguration(_user);
            userTokens[i].enabledAsCollateral = isUsingAsCollateral(map, reserveData.id);
        }
    }

    /// @notice Information about reserves
    /// @param _market Address of LendingPoolAddressesProvider for specific market
    /// @param _tokenAddresses Array of tokens addresses
    /// @return tokens Array of reserves information
    function getTokensInfo(address _market, address[] memory _tokenAddresses)
        public
        view
        returns (TokenInfo[] memory tokens)
    {
        IPoolV3 lendingPool = getLendingPool(_market);
        tokens = new TokenInfo[](_tokenAddresses.length);

        for (uint256 i = 0; i < _tokenAddresses.length; i++) {
            DataTypes.ReserveConfigurationMap memory config = lendingPool.getConfiguration(
                _tokenAddresses[i]
            );
            uint256 collFactor = config.data & ~LTV_MASK;
            DataTypes.ReserveData memory reserveData = lendingPool.getReserveData(
                _tokenAddresses[i]
            );
            address aTokenAddr = reserveData.aTokenAddress;
            address priceOracleAddress = IPoolAddressesProvider(_market).getPriceOracle();
            uint256 price = IAaveV3Oracle(priceOracleAddress).getAssetPrice(_tokenAddresses[i]);
            tokens[i] = TokenInfo({
                aTokenAddress: aTokenAddr,
                underlyingTokenAddress: _tokenAddresses[i],
                collateralFactor: collFactor,
                price: price
            });
        }
    }

    function getTokenInfoFull(address _market, address _tokenAddr)
        public
        view
        returns (TokenInfoFull memory _tokenInfo)
    {
        IPoolV3 lendingPool = getLendingPool(_market);

        DataTypes.ReserveData memory reserveData = lendingPool.getReserveData(_tokenAddr);
        DataTypes.ReserveConfigurationMap memory config = lendingPool.getConfiguration(_tokenAddr);

        uint256 totalVariableBorrow = IERC20(reserveData.variableDebtTokenAddress).totalSupply();
        uint256 totalStableBorrow = IERC20(reserveData.stableDebtTokenAddress).totalSupply();

        _tokenInfo = TokenInfoFull({
            aTokenAddress: reserveData.aTokenAddress,
            underlyingTokenAddress: _tokenAddr,
            assetId: reserveData.id,
            supplyRate: reserveData.currentLiquidityRate,
            borrowRateVariable: reserveData.currentVariableBorrowRate,
            borrowRateStable: reserveData.currentStableBorrowRate,
            totalSupply: IERC20(reserveData.aTokenAddress).totalSupply(),
            availableLiquidity: _tokenAddr.getBalance(reserveData.aTokenAddress),
            totalBorrow: totalVariableBorrow + totalStableBorrow,
            totalBorrowVar: totalVariableBorrow,
            totalBorrowStab: totalStableBorrow,
            collateralFactor: getLtv(config),
            liquidationRatio: getLiquidationThreshold(config),
            price: getAssetPrice(_market, _tokenAddr),
            supplyCap: getSupplyCap(config),
            borrowCap: getBorrowCap(config),
            emodeCategory: getEModeCategory(config),
            usageAsCollateralEnabled: getLiquidationThreshold(config) > 0,
            borrowingEnabled: getBorrowingEnabled(config),
            stableBorrowRateEnabled: getStableRateBorrowingEnabled(config),
            isolationModeBorrowingEnabled: getBorrowableInIsolation(config),
            debtCeilingForIsolationMode: getDebtCeiling(config),
            isolationModeTotalDebt: reserveData.isolationModeTotalDebt,
            isSiloedForBorrowing: isSiloedForBorrowing(_market, _tokenAddr),
            eModeCollateralFactor: getEModeCollateralFactor(uint8(getEModeCategory(config)), lendingPool),
            isFlashLoanEnabled: getFlashLoanEnabled(config)
        });
    }

    /// @notice Information about reserves
    /// @param _market Address of LendingPoolAddressesProvider for specific market
    /// @param _tokenAddresses Array of token addresses
    /// @return tokens Array of reserves information
    function getFullTokensInfo(address _market, address[] memory _tokenAddresses) public view returns(TokenInfoFull[] memory tokens) {
        tokens = new TokenInfoFull[](_tokenAddresses.length);
        for (uint256 i = 0; i < _tokenAddresses.length; ++i) {
            tokens[i] = getTokenInfoFull(_market, _tokenAddresses[i]);
        }
    }


    /// @notice Fetches all the collateral/debt address and amounts, denominated in ether
    /// @param _market Address of LendingPoolAddressesProvider for specific market
    /// @param _user Address of the user
    /// @return data LoanData information
    function getLoanData(address _market, address _user) public view returns (LoanData memory data) {
        IPoolV3 lendingPool = getLendingPool(_market);
        address[] memory reserveList = lendingPool.getReservesList();
        uint256 eMode = lendingPool.getUserEMode(_user);
        
        DataTypes.EModeCategory memory categoryData = lendingPool.getEModeCategoryData(uint8(eMode));
        
        data = LoanData({
            eMode: eMode,
            user: _user,
            ratio: 0,
            collAddr: new address[](reserveList.length),
            borrowAddr: new address[](reserveList.length),
            collAmounts: new uint[](reserveList.length),
            borrowStableAmounts: new uint[](reserveList.length),
            borrowVariableAmounts: new uint[](reserveList.length),
            ltv: categoryData.ltv,
            liquidationThreshold: categoryData.liquidationThreshold,
            liquidationBonus: categoryData.liquidationBonus,
            priceSource: categoryData.priceSource,
            label: categoryData.label
        });

        uint64 collPos = 0;
        uint64 borrowPos = 0;

        for (uint256 i = 0; i < reserveList.length; i++) {
            address reserve = reserveList[i];
            uint256 price = getAssetPrice(_market, reserve);
            DataTypes.ReserveData memory reserveData = lendingPool.getReserveData(reserve);
            uint256 aTokenBalance = reserveData.aTokenAddress.getBalance(_user);
            uint256 borrowsStable = reserveData.stableDebtTokenAddress.getBalance(_user);
            uint256 borrowsVariable = reserveData.variableDebtTokenAddress.getBalance(_user);
        
            if (aTokenBalance > 0) {
                uint256 userTokenBalanceEth = (aTokenBalance * price) / (10 ** (reserve.getTokenDecimals()));
                data.collAddr[collPos] = reserve;
                data.collAmounts[collPos] = userTokenBalanceEth;
                collPos++;
            }

            // Sum up debt in Usd
            if (borrowsStable > 0) {
                uint256 userBorrowBalanceEth = (borrowsStable * price) / (10 ** (reserve.getTokenDecimals()));
                data.borrowAddr[borrowPos] = reserve;
                data.borrowStableAmounts[borrowPos] = userBorrowBalanceEth;
            }

            // Sum up debt in Usd
            if (borrowsVariable > 0) {
                uint256 userBorrowBalanceEth = (borrowsVariable * price) / (10 ** (reserve.getTokenDecimals()));
                data.borrowAddr[borrowPos] = reserve;
                data.borrowVariableAmounts[borrowPos] = userBorrowBalanceEth;
            }

            if (borrowsStable > 0 || borrowsVariable > 0) {
                borrowPos++;
            }
        }

        data.ratio = uint128(getSafetyRatio(_market, _user));

        return data;
    }
    /// @notice Fetches all the collateral/debt address and amounts, denominated in ether
    /// @param _market Address of LendingPoolAddressesProvider for specific market
    /// @param _users Addresses of the user
    /// @return loans Array of LoanData information
    function getLoanDataArr(address _market, address[] memory _users) public view returns (LoanData[] memory loans) {
        loans = new LoanData[](_users.length);

        for (uint i = 0; i < _users.length; ++i) {
            loans[i] = getLoanData(_market, _users[i]);
        }
    }

    function getLtv(DataTypes.ReserveConfigurationMap memory self) public pure returns (uint256) {
        return self.data & ~LTV_MASK;
    }

    function getReserveFactor(DataTypes.ReserveConfigurationMap memory self)
        internal
        pure
        returns (uint256)
    {
        return (self.data & ~RESERVE_FACTOR_MASK) >> RESERVE_FACTOR_START_BIT_POSITION;
    }

    function isUsingAsCollateral(DataTypes.UserConfigurationMap memory self, uint256 reserveIndex)
        internal
        pure
        returns (bool)
    {
        unchecked {
            return (self.data >> ((reserveIndex << 1) + 1)) & 1 != 0;
        }
    }

    function getLiquidationThreshold(DataTypes.ReserveConfigurationMap memory self)
        internal
        pure
        returns (uint256)
    {
        return
            (self.data & ~LIQUIDATION_THRESHOLD_MASK) >> LIQUIDATION_THRESHOLD_START_BIT_POSITION;
    }

    function getAssetPrice(address _market, address _tokenAddr)
        public
        view
        returns (uint256 price)
    {
        address priceOracleAddress = IPoolAddressesProvider(_market).getPriceOracle();
        price = IAaveV3Oracle(priceOracleAddress).getAssetPrice(_tokenAddr);
    }

    function getBorrowCap(DataTypes.ReserveConfigurationMap memory self)
        internal
        pure
        returns (uint256)
    {
        return (self.data & ~BORROW_CAP_MASK) >> BORROW_CAP_START_BIT_POSITION;
    }

    function getSupplyCap(DataTypes.ReserveConfigurationMap memory self)
        internal
        pure
        returns (uint256)
    {
        return (self.data & ~SUPPLY_CAP_MASK) >> SUPPLY_CAP_START_BIT_POSITION;
    }

    function getEModeCategory(DataTypes.ReserveConfigurationMap memory self)
        internal
        pure
        returns (uint256)
    {
        return (self.data & ~EMODE_CATEGORY_MASK) >> EMODE_CATEGORY_START_BIT_POSITION;
    }

    function getBorrowingEnabled(DataTypes.ReserveConfigurationMap memory self)
        internal
        pure
        returns (bool)
    {
        return (self.data & ~BORROWING_MASK) != 0;
    }

    function getStableRateBorrowingEnabled(DataTypes.ReserveConfigurationMap memory self)
        internal
        pure
        returns (bool)
    {
        return (self.data & ~STABLE_BORROWING_MASK) != 0;
    }

    function getBorrowableInIsolation(DataTypes.ReserveConfigurationMap memory self)
        internal
        pure
        returns (bool)
    {
        return (self.data & ~BORROWABLE_IN_ISOLATION_MASK) != 0;
    }

    /**
    * @notice Gets the debt ceiling for the asset if the asset is in isolation mode
    * @param self The reserve configuration
    * @return The debt ceiling (0 = isolation mode disabled)
    **/
    function getDebtCeiling(DataTypes.ReserveConfigurationMap memory self)
        internal
        pure
        returns (uint256)
    {
        return (self.data & ~DEBT_CEILING_MASK) >> DEBT_CEILING_START_BIT_POSITION;
    }

    function isSiloedForBorrowing(address _market, address _tokenAddr) internal view returns (bool){
        IAaveProtocolDataProvider dataProvider = getDataProvider(_market);
        return dataProvider.getSiloedBorrowing(_tokenAddr);
    }

    function getEModeCollateralFactor(uint256 emodeCategory, IPoolV3 lendingPool) public view returns (uint16){
        DataTypes.EModeCategory memory categoryData = lendingPool.getEModeCategoryData(uint8(emodeCategory));
        return categoryData.ltv;
    }

    function getFlashLoanEnabled(DataTypes.ReserveConfigurationMap memory self) internal pure returns (bool) {
        return (self.data & ~FLASHLOAN_ENABLED_MASK) != 0;
    }

}
