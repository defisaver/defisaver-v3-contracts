// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IAaveV3Oracle } from "../interfaces/protocols/aaveV3/IAaveV3Oracle.sol";
import { IPriceOracleSentinel } from "../interfaces/protocols/aaveV3/IPriceOracleSentinel.sol";
import { IPoolV3 } from "../interfaces/protocols/aaveV3/IPoolV3.sol";
import { IPoolAddressesProvider } from "../interfaces/protocols/aaveV3/IPoolAddressesProvider.sol";
import { IAaveProtocolDataProvider } from "../interfaces/protocols/aaveV3/IAaveProtocolDataProvider.sol";
import { IReserveInterestRateStrategy } from "../interfaces/protocols/aaveV3/IReserveInterestRateStrategy.sol";
import { IScaledBalanceToken } from "../interfaces/protocols/aave/IScaledBalanceToken.sol";
import { IUmbrella } from "../interfaces/protocols/aaveV3/IUmbrella.sol";
import { IERC20 } from "../interfaces/token/IERC20.sol";
import { IERC4626 } from "../interfaces/token/IERC4626.sol";
import { IERC4626StakeToken } from "../interfaces/protocols/aaveV3/IERC4626StakeToken.sol";
import { IUmbrellaRewardsController } from "../interfaces/protocols/aaveV3/IUmbrellaRewardsController.sol";
import { IStaticATokenV2 } from "../interfaces/protocols/aaveV3/IStaticATokenV2.sol";
import { IDebtToken } from "../interfaces/protocols/aaveV3/IDebtToken.sol";

import { DataTypes } from "../interfaces/protocols/aaveV3/DataTypes.sol";
import { WadRayMath } from "../_vendor/aave/WadRayMath.sol";
import { MathUtils } from "../_vendor/aave/MathUtils.sol";
import { AaveV3Helper } from "../actions/aaveV3/helpers/AaveV3Helper.sol";
import { AaveV3RatioHelper } from "../actions/aaveV3/helpers/AaveV3RatioHelper.sol";
import { TokenUtils } from "../utils/token/TokenUtils.sol";

/// @title Helper contract to aggregate data from AaveV3 protocol
contract AaveV3View is AaveV3Helper, AaveV3RatioHelper {
    uint256 internal constant LIQUIDATION_BONUS_MASK =
        0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF0000FFFFFFFF; // prettier-ignore
    uint256 internal constant BORROW_CAP_MASK = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF000000000FFFFFFFFFFFFFFFFFFFF; // prettier-ignore
    uint256 internal constant SUPPLY_CAP_MASK = 0xFFFFFFFFFFFFFFFFFFFFFFFFFF000000000FFFFFFFFFFFFFFFFFFFFFFFFFFFFF; // prettier-ignore
    uint256 internal constant EMODE_CATEGORY_MASK = 0xFFFFFFFFFFFFFFFFFFFF00FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF; // prettier-ignore
    uint256 internal constant BORROWABLE_IN_ISOLATION_MASK =
        0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFDFFFFFFFFFFFFFFF; // prettier-ignore
    uint256 internal constant BORROWING_MASK = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFBFFFFFFFFFFFFFF; // prettier-ignore
    uint256 internal constant LTV_MASK = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF0000; // prettier-ignore
    uint256 internal constant RESERVE_FACTOR_MASK = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF0000FFFFFFFFFFFFFFFF; // prettier-ignore
    uint256 internal constant LIQUIDATION_THRESHOLD_MASK =
        0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF0000FFFF; // prettier-ignore
    uint256 internal constant DEBT_CEILING_MASK = 0xF0000000000FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF; // prettier-ignore
    uint256 internal constant FLASHLOAN_ENABLED_MASK =
        0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF7FFFFFFFFFFFFFFF; // prettier-ignore
    uint256 internal constant ACTIVE_MASK = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFFFFFFFFFF; // prettier-ignore
    uint256 internal constant FROZEN_MASK = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFDFFFFFFFFFFFFFF; // prettier-ignore
    uint256 internal constant PAUSED_MASK = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFFFFFFFFFFF; // prettier-ignore
    uint256 internal constant VIRTUAL_ACC_ACTIVE = 0xEFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF; // prettier-ignore

    uint256 internal constant LIQUIDATION_THRESHOLD_START_BIT_POSITION = 16;
    uint256 internal constant LIQUIDATION_BONUS_START_BIT_POSITION = 32;
    uint256 internal constant RESERVE_FACTOR_START_BIT_POSITION = 64;
    uint256 internal constant BORROWING_ENABLED_START_BIT_POSITION = 58;
    uint256 internal constant BORROW_CAP_START_BIT_POSITION = 80;
    uint256 internal constant SUPPLY_CAP_START_BIT_POSITION = 116;
    uint256 internal constant DEBT_CEILING_START_BIT_POSITION = 212;
    uint256 internal constant FLASHLOAN_ENABLED_START_BIT_POSITION = 63;

    using TokenUtils for address;
    using WadRayMath for uint256;

    /**
     *
     *                         DATA SPECIFICATION
     *
     */
    /// @notice User loan data
    struct LoanData {
        address user;
        uint128 ratio;
        uint256 eMode;
        address[] collAddr;
        bool[] enabledAsColl;
        address[] borrowAddr;
        uint256[] collAmounts;
        uint256[] borrowStableAmounts;
        uint256[] borrowVariableAmounts;
        // emode category data
        uint16 ltv;
        uint16 liquidationThreshold;
        uint16 liquidationBonus;
        address priceSource; // deprecated
        string label;
    }

    /// @notice User token data
    struct UserToken {
        address token;
        uint256 balance;
        uint256 borrowsStable;
        uint256 borrowsVariable;
        uint256 stableBorrowRate;
        bool enabledAsCollateral;
    }

    /// @notice Token info basic data
    struct TokenInfo {
        address aTokenAddress;
        address underlyingTokenAddress;
        uint256 collateralFactor;
        uint256 price;
    }

    /// @notice Token info full data
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
        // emode category data
        uint16 ltv; // deprecated
        uint16 liquidationThreshold; // deprecated
        uint16 liquidationBonus; // deprecated
        address priceSource; // deprecated
        string label; // deprecated
        bool isActive;
        bool isPaused;
        bool isFrozen;
        address debtTokenAddress;
    }

    /// @notice Params for supply and borrow rate estimation
    struct LiquidityChangeParams {
        address reserveAddress; // address of the reserve
        uint256 liquidityAdded; // amount of liquidity added (supply/repay)
        uint256 liquidityTaken; // amount of liquidity taken (borrow/withdraw)
        bool isDebtAsset; // isDebtAsset if operation is borrow/payback
    }

    /// @notice Helper struct for supply and borrow rate estimation
    struct EstimatedRates {
        address reserveAddress;
        uint256 supplyRate;
        uint256 variableBorrowRate;
    }

    /// @notice Umbrella staking data
    struct UmbrellaStkData {
        address stkToken; // address of the stk token
        uint256 totalShares; // total shares of the stk token
        address stkUnderlyingToken; // underlying token of the stk token. GHO or waToken
        address aToken; // if stkUnderlyingToken is waToken, this will be the underlying aToken
        uint256 cooldownPeriod; // cooldown period of the stk token
        uint256 unstakeWindow; // unstake window of the stk token
        uint256 stkTokenToWaTokenRate; // rate of stk token to wa token
        uint256 waTokenToATokenRate; // rate of waToken to aToken. 1e18 for GHO
        uint256[] rewardsEmissionRates; // emission rates of the rewards
        uint256 userCooldownAmount; // amount of shares available to redeem
        uint256 userEndOfCooldown; // timestamp after which funds will be unlocked for withdrawal
        uint256 userWithdrawalWindow; // period of time to withdraw funds after end of cooldown
    }

    /// @notice EOA approval and balance data for a specific asset
    struct EOAApprovalData {
        address asset; // underlying asset address
        address aToken; // aToken address
        address variableDebtToken; // variable debt token address
        uint256 assetApproval; // EOA approval to SW for underlying asset
        uint256 aTokenApproval; // EOA approval to SW for aToken
        uint256 variableDebtDelegation; // EOA debt delegation to SW for variable debt
        uint256 borrowedVariableAmount; // amount EOA has borrowed (variable)
        uint256 eoaBalance; // EOA's underlying asset balance
        uint256 aTokenBalance; // EOA's aToken balance
    }

    /**
     *
     *                         PUBLIC/EXTERNAL FUNCTIONS
     *
     */
    /// @notice Fetches the health factor of a user
    /// @param _market Address of LendingPoolAddressesProvider for specific market
    /// @param _user Address of the user
    /// @return healthFactor Health factor of the user
    function getHealthFactor(address _market, address _user) public view returns (uint256 healthFactor) {
        IPoolV3 lendingPool = getLendingPool(_market);

        (,,,,, healthFactor) = lendingPool.getUserAccountData(_user);
    }

    /// @notice Fetches Aave prices for tokens
    /// @param _market Address of LendingPoolAddressesProvider for specific market
    /// @param _tokens Arr. of tokens for which to get the prices
    /// @return prices Array of prices
    function getPrices(address _market, address[] memory _tokens) public view returns (uint256[] memory prices) {
        address priceOracleAddress = IPoolAddressesProvider(_market).getPriceOracle();
        prices = IAaveV3Oracle(priceOracleAddress).getAssetsPrices(_tokens);
    }

    /// @notice Calculated the ratio of coll/debt for an aave user
    /// @param _market Address of LendingPoolAddressesProvider for specific market
    /// @param _users Addresses of the user
    /// @return ratios Array of ratios
    function getRatios(address _market, address[] memory _users) public view returns (uint256[] memory ratios) {
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
            DataTypes.ReserveConfigurationMap memory config = lendingPool.getConfiguration(_tokens[i]);
            collFactors[i] = getReserveFactor(config);
        }
    }

    /// @notice Fetches the balances of a user for a list of tokens
    /// @param _market Address of LendingPoolAddressesProvider for specific market
    /// @param _user Address of the user
    /// @param _tokens Array of token addresses
    /// @return userTokens Array of user token data
    function getTokenBalances(address _market, address _user, address[] memory _tokens)
        public
        view
        returns (UserToken[] memory userTokens)
    {
        IPoolV3 lendingPool = getLendingPool(_market);
        userTokens = new UserToken[](_tokens.length);

        for (uint256 i = 0; i < _tokens.length; i++) {
            DataTypes.ReserveData memory reserveData = lendingPool.getReserveData(_tokens[i]);
            userTokens[i].balance = reserveData.aTokenAddress.getBalance(_user);
            userTokens[i].borrowsStable = 0;
            userTokens[i].borrowsVariable = reserveData.variableDebtTokenAddress.getBalance(_user);
            userTokens[i].stableBorrowRate = 0;
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
            DataTypes.ReserveConfigurationMap memory config = lendingPool.getConfiguration(_tokenAddresses[i]);
            uint256 collFactor = config.data & ~LTV_MASK;
            address aTokenAddr = lendingPool.getReserveAToken(_tokenAddresses[i]);
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

    /// @notice Fetches the full information about a token
    /// @param _market Address of LendingPoolAddressesProvider for specific market
    /// @param _tokenAddr Address of the token
    /// @return _tokenInfo Full information about the token
    function getTokenInfoFull(address _market, address _tokenAddr)
        public
        view
        returns (TokenInfoFull memory _tokenInfo)
    {
        IPoolV3 lendingPool = getLendingPool(_market);

        DataTypes.ReserveData memory reserveData = lendingPool.getReserveData(_tokenAddr);
        DataTypes.ReserveConfigurationMap memory config = lendingPool.getConfiguration(_tokenAddr);

        uint256 totalVariableBorrow = IERC20(reserveData.variableDebtTokenAddress).totalSupply();

        (bool isActive, bool isFrozen,, bool isPaused) = getFlags(config);

        _tokenInfo = TokenInfoFull({
            aTokenAddress: reserveData.aTokenAddress,
            underlyingTokenAddress: _tokenAddr,
            assetId: reserveData.id,
            supplyRate: reserveData.currentLiquidityRate,
            borrowRateVariable: reserveData.currentVariableBorrowRate,
            borrowRateStable: 0,
            totalSupply: IERC20(reserveData.aTokenAddress).totalSupply() + reserveData.accruedToTreasury,
            availableLiquidity: _tokenAddr.getBalance(reserveData.aTokenAddress),
            totalBorrow: totalVariableBorrow,
            totalBorrowVar: totalVariableBorrow,
            totalBorrowStab: 0,
            collateralFactor: getLtv(config),
            liquidationRatio: getLiquidationThreshold(config),
            price: getAssetPrice(_market, _tokenAddr),
            supplyCap: getSupplyCap(config),
            borrowCap: getBorrowCap(config),
            emodeCategory: 0,
            usageAsCollateralEnabled: getLiquidationThreshold(config) > 0,
            borrowingEnabled: getBorrowingEnabled(config),
            stableBorrowRateEnabled: false,
            isolationModeBorrowingEnabled: getBorrowableInIsolation(config),
            debtCeilingForIsolationMode: getDebtCeiling(config),
            isolationModeTotalDebt: reserveData.isolationModeTotalDebt,
            isSiloedForBorrowing: isSiloedForBorrowing(_market, _tokenAddr),
            eModeCollateralFactor: 0,
            isFlashLoanEnabled: getFlashLoanEnabled(config),
            ltv: 0, // same as collateralFactor
            liquidationThreshold: 0, // same as liquidationRatio
            liquidationBonus: uint16(getLiquidationBonus(config)),
            priceSource: address(0), // deprecated, not 1:1 related to asset
            label: "", // deprecated, not 1:1 related to asset
            isActive: isActive,
            isPaused: isPaused,
            isFrozen: isFrozen,
            debtTokenAddress: reserveData.variableDebtTokenAddress
        });
    }

    /// @notice Information about reserves
    /// @param _market Address of LendingPoolAddressesProvider for specific market
    /// @param _tokenAddresses Array of token addresses
    /// @return tokens Array of reserves information
    function getFullTokensInfo(address _market, address[] memory _tokenAddresses)
        public
        view
        returns (TokenInfoFull[] memory tokens)
    {
        tokens = new TokenInfoFull[](_tokenAddresses.length);
        for (uint256 i = 0; i < _tokenAddresses.length; ++i) {
            tokens[i] = getTokenInfoFull(_market, _tokenAddresses[i]);
        }
    }

    /// @notice Fetches all the e-mode categories
    /// @param _market Address of LendingPoolAddressesProvider for specific market
    /// @return emodesData Array of e-mode categories
    function getAllEmodes(address _market) public view returns (DataTypes.EModeCategoryNew[] memory emodesData) {
        emodesData = new DataTypes.EModeCategoryNew[](256);
        IPoolV3 lendingPool = getLendingPool(_market);
        for (uint8 i = 1; i < 255; i++) {
            DataTypes.EModeCategoryNew memory nextEmodeData = getEmodeData(lendingPool, i);
            if (bytes(nextEmodeData.label).length == 0) break;
            emodesData[i - 1] = nextEmodeData;
        }
    }

    /// @notice Fetches the e-mode data for a specific e-mode category
    /// @param _lendingPool Address of the lending pool
    /// @param _id ID of the e-mode category
    /// @return emodeData E-mode data for the specific category
    function getEmodeData(IPoolV3 _lendingPool, uint8 _id)
        public
        view
        returns (DataTypes.EModeCategoryNew memory emodeData)
    {
        DataTypes.CollateralConfig memory config = _lendingPool.getEModeCategoryCollateralConfig(_id);
        emodeData = DataTypes.EModeCategoryNew({
            ltv: config.ltv,
            liquidationThreshold: config.liquidationThreshold,
            liquidationBonus: config.liquidationBonus,
            collateralBitmap: _lendingPool.getEModeCategoryCollateralBitmap(_id),
            borrowableBitmap: _lendingPool.getEModeCategoryBorrowableBitmap(_id),
            label: _lendingPool.getEModeCategoryLabel(_id)
        });
    }

    /// @notice Fetches all the collateral/debt address and amounts, denominated in ether
    /// @param _market Address of LendingPoolAddressesProvider for specific market
    /// @param _user Address of the user
    /// @return data LoanData information
    function getLoanData(address _market, address _user) public view returns (LoanData memory data) {
        IPoolV3 lendingPool = getLendingPool(_market);
        address[] memory reserveList = lendingPool.getReservesList();
        uint256 eModeId = lendingPool.getUserEMode(_user);

        data = LoanData({
            eMode: eModeId,
            user: _user,
            ratio: 0,
            collAddr: new address[](reserveList.length),
            enabledAsColl: new bool[](reserveList.length),
            borrowAddr: new address[](reserveList.length),
            collAmounts: new uint256[](reserveList.length),
            borrowStableAmounts: new uint256[](reserveList.length),
            borrowVariableAmounts: new uint256[](reserveList.length),
            ltv: 0,
            liquidationThreshold: 0,
            liquidationBonus: 0,
            priceSource: address(0),
            label: ""
        });

        uint64 collPos = 0;
        uint64 borrowPos = 0;

        for (uint256 i = 0; i < reserveList.length; i++) {
            address reserve = reserveList[i];
            uint256 price = getAssetPrice(_market, reserve);
            DataTypes.ReserveData memory reserveData = lendingPool.getReserveData(reserve);
            {
                uint256 aTokenBalance = reserveData.aTokenAddress.getBalance(_user);
                if (aTokenBalance > 0) {
                    data.collAddr[collPos] = reserve;
                    data.enabledAsColl[collPos] =
                        isUsingAsCollateral(lendingPool.getUserConfiguration(_user), reserveData.id);
                    uint256 userTokenBalanceEth = (aTokenBalance * price) / (10 ** (reserve.getTokenDecimals()));
                    data.collAmounts[collPos] = userTokenBalanceEth;
                    collPos++;
                }
            }
            // Sum up debt in Usd
            uint256 borrowsVariable = reserveData.variableDebtTokenAddress.getBalance(_user);
            if (borrowsVariable > 0) {
                uint256 userBorrowBalanceEth = (borrowsVariable * price) / (10 ** (reserve.getTokenDecimals()));
                data.borrowAddr[borrowPos] = reserve;
                data.borrowVariableAmounts[borrowPos] = userBorrowBalanceEth;
            }
            if (borrowsVariable > 0) {
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

        for (uint256 i = 0; i < _users.length; ++i) {
            loans[i] = getLoanData(_market, _users[i]);
        }
    }

    /// @notice Fetches the ltv of a reserve
    /// @param self The reserve configuration
    /// @return ltv The ltv of the reserve
    function getLtv(DataTypes.ReserveConfigurationMap memory self) public pure returns (uint256) {
        return self.data & ~LTV_MASK;
    }

    /// @notice Fetches the reserve factor of a reserve
    /// @param self The reserve configuration
    /// @return reserveFactor The reserve factor of the reserve
    function getReserveFactor(DataTypes.ReserveConfigurationMap memory self) internal pure returns (uint256) {
        return (self.data & ~RESERVE_FACTOR_MASK) >> RESERVE_FACTOR_START_BIT_POSITION;
    }

    /// @notice Fetches the price of a token
    /// @param _market Address of LendingPoolAddressesProvider for specific market
    /// @param _tokenAddr Address of the token
    /// @return price The price of the token
    function getAssetPrice(address _market, address _tokenAddr) public view returns (uint256 price) {
        address priceOracleAddress = IPoolAddressesProvider(_market).getPriceOracle();
        price = IAaveV3Oracle(priceOracleAddress).getAssetPrice(_tokenAddr);
    }

    /// @notice Fetches the e-mode collateral factor for a specific e-mode category
    /// @param emodeCategory ID of the e-mode category
    /// @param lendingPool Address of the lending pool
    /// @return eModeCollateralFactor The e-mode collateral factor for the specific category
    function getEModeCollateralFactor(uint256 emodeCategory, IPoolV3 lendingPool) public view returns (uint16) {
        DataTypes.EModeCategoryLegacy memory categoryData = lendingPool.getEModeCategoryData(uint8(emodeCategory));
        return categoryData.ltv;
    }

    /// @notice Checks if borrow is allowed for a market
    /// @param _market Address of LendingPoolAddressesProvider for specific market
    /// @return isBorrowAllowed True if borrow is allowed
    function isBorrowAllowed(address _market) public view returns (bool) {
        address priceOracleSentinelAddress = IPoolAddressesProvider(_market).getPriceOracleSentinel();
        return (priceOracleSentinelAddress == address(0)
                || IPriceOracleSentinel(priceOracleSentinelAddress).isBorrowAllowed());
    }

    /// @notice Fetches the apy after values estimation
    /// @param _market Address of LendingPoolAddressesProvider for specific market
    /// @param _reserveParams Array of liquidity change parameters
    /// @return estimatedRates Array of estimated rates
    function getApyAfterValuesEstimation(address _market, LiquidityChangeParams[] memory _reserveParams)
        public
        view
        returns (EstimatedRates[] memory)
    {
        IPoolV3 lendingPool = getLendingPool(_market);
        EstimatedRates[] memory estimatedRates = new EstimatedRates[](_reserveParams.length);
        for (uint256 i = 0; i < _reserveParams.length; ++i) {
            address asset = _reserveParams[i].reserveAddress;
            DataTypes.ReserveData memory reserve = lendingPool.getReserveData(asset);

            uint256 totalVarDebt = IScaledBalanceToken(reserve.variableDebtTokenAddress).scaledTotalSupply()
                .rayMul(_getNextVariableBorrowIndex(reserve));

            if (_reserveParams[i].isDebtAsset) {
                totalVarDebt += _reserveParams[i].liquidityTaken;
                totalVarDebt = _reserveParams[i].liquidityAdded >= totalVarDebt
                    ? 0
                    : totalVarDebt - _reserveParams[i].liquidityAdded;
            }

            (uint256 estimatedSupplyRate, uint256 estimatedVariableBorrowRate) = IReserveInterestRateStrategy(
                    lendingPool.RESERVE_INTEREST_RATE_STRATEGY()
                )
                .calculateInterestRates(
                    DataTypes.CalculateInterestRatesParams({
                        unbacked: lendingPool.getReserveDeficit(asset),
                        liquidityAdded: _reserveParams[i].liquidityAdded,
                        liquidityTaken: _reserveParams[i].liquidityTaken,
                        totalDebt: totalVarDebt,
                        reserveFactor: getReserveFactor(reserve.configuration),
                        reserve: asset,
                        usingVirtualBalance: true,
                        virtualUnderlyingBalance: lendingPool.getVirtualUnderlyingBalance(asset)
                    })
                );

            estimatedRates[i] = EstimatedRates({
                reserveAddress: asset, supplyRate: estimatedSupplyRate, variableBorrowRate: estimatedVariableBorrowRate
            });
        }

        return estimatedRates;
    }

    /// @notice Fetches the additional umbrella staking data and user snapshot data if needed
    /// @param _umbrella Address of the umbrella
    /// @param _user Address of the user (Optional)
    /// @return retVal Array of UmbrellaStkData
    function getAdditionalUmbrellaStakingData(address _umbrella, address _user)
        external
        view
        returns (UmbrellaStkData[] memory retVal)
    {
        address[] memory stkTokens = IUmbrella(_umbrella).getStkTokens();
        retVal = new UmbrellaStkData[](stkTokens.length);
        for (uint256 i = 0; i < stkTokens.length; ++i) {
            retVal[i] = _fetchStkTokenData(stkTokens[i], _user);
        }
    }

    /// @notice Fetches EOA balances and approvals towards proxy for all assets in a market
    /// @param _eoa Address of the EOA
    /// @param _proxy Address of the proxy/smart wallet
    /// @param _market Address of the Aave market
    /// @return approvalData Array of EOAApprovalData for all assets
    function getEOAApprovalsAndBalancesForAllTokens(address _eoa, address _proxy, address _market)
        public
        view
        returns (EOAApprovalData[] memory approvalData)
    {
        IPoolV3 lendingPool = getLendingPool(_market);
        address[] memory reserveList = lendingPool.getReservesList();
        approvalData = new EOAApprovalData[](reserveList.length);

        for (uint256 i = 0; i < reserveList.length; i++) {
            approvalData[i] = getEOAApprovalsAndBalances(reserveList[i], _eoa, _proxy, _market);
        }
    }

    /// @notice Fetches `_eoa` balances and approvals towards `_proxy` for `_assets` in a `_market`
    /// @param _eoa Address of the EOA
    /// @param _proxy Address of the smart wallet
    /// @param _market Address of the Aave market
    /// @return approvalData EOAApprovalData for selected params
    function getEOAApprovalsAndBalances(address _asset, address _eoa, address _proxy, address _market)
        public
        view
        returns (EOAApprovalData memory approvalData)
    {
        IPoolV3 lendingPool = getLendingPool(_market);
        IAaveProtocolDataProvider dataProvider = getDataProvider(_market);

        DataTypes.ReserveData memory reserveData = lendingPool.getReserveData(_asset);

        // Get user data from protocol data provider
        (uint256 currentATokenBalance,, uint256 currentVariableDebt,,,,,,) =
            dataProvider.getUserReserveData(_asset, _eoa);

        approvalData = EOAApprovalData({
            asset: _asset,
            aToken: reserveData.aTokenAddress,
            variableDebtToken: reserveData.variableDebtTokenAddress,
            assetApproval: IERC20(_asset).allowance(_eoa, _proxy),
            aTokenApproval: IERC20(reserveData.aTokenAddress).allowance(_eoa, _proxy),
            variableDebtDelegation: IDebtToken(reserveData.variableDebtTokenAddress).borrowAllowance(_eoa, _proxy),
            borrowedVariableAmount: currentVariableDebt,
            eoaBalance: IERC20(_asset).balanceOf(_eoa),
            aTokenBalance: currentATokenBalance
        });
    }

    /**
     *
     *                         INTERNAL FUNCTIONS
     *
     */
    /// @notice Fetches the additional stk token data and user snapshot data if needed
    /// @param _stkToken Address of the stk token
    /// @param _user Address of the user (Optional)
    /// @return retVal UmbrellaStkData
    function _fetchStkTokenData(address _stkToken, address _user)
        internal
        view
        returns (UmbrellaStkData memory retVal)
    {
        retVal.stkToken = _stkToken;
        retVal.totalShares = IERC20(_stkToken).totalSupply();
        retVal.cooldownPeriod = IERC4626StakeToken(_stkToken).getCooldown();
        retVal.unstakeWindow = IERC4626StakeToken(_stkToken).getUnstakeWindow();
        retVal.stkUnderlyingToken = IERC4626(_stkToken).asset();

        if (retVal.stkUnderlyingToken != GHO_TOKEN) {
            retVal.aToken = IStaticATokenV2(retVal.stkUnderlyingToken).aToken();
        }

        uint256 baseUnit = 10 ** IERC20(_stkToken).decimals();
        retVal.stkTokenToWaTokenRate = IERC4626(_stkToken).convertToAssets(baseUnit);

        address waToken = IERC4626(_stkToken).asset();
        retVal.waTokenToATokenRate = (waToken != GHO_TOKEN) ? IERC4626(waToken).convertToAssets(baseUnit) : baseUnit;

        IUmbrellaRewardsController rewardsController = IUmbrellaRewardsController(UMBRELLA_REWARDS_CONTROLLER_ADDRESS);

        address[] memory rewards = rewardsController.getAllRewards(_stkToken);

        uint256[] memory rewardsEmissionRates = new uint256[](rewards.length);
        for (uint256 i = 0; i < rewards.length; ++i) {
            rewardsEmissionRates[i] = rewardsController.calculateCurrentEmission(_stkToken, rewards[i]);
        }

        retVal.rewardsEmissionRates = rewardsEmissionRates;

        if (_user != address(0)) {
            IERC4626StakeToken.CooldownSnapshot memory cooldownSnapshot =
                IERC4626StakeToken(_stkToken).getStakerCooldown(_user);
            retVal.userCooldownAmount = cooldownSnapshot.amount;
            retVal.userEndOfCooldown = cooldownSnapshot.endOfCooldown;
            retVal.userWithdrawalWindow = cooldownSnapshot.withdrawalWindow;
        }
    }

    /// @notice Checks if a reserve is used as collateral
    /// @param self The user configuration
    /// @param reserveIndex Index of the reserve
    /// @return isUsingAsCollateral True if the reserve is used as collateral
    function isUsingAsCollateral(DataTypes.UserConfigurationMap memory self, uint256 reserveIndex)
        internal
        pure
        returns (bool)
    {
        unchecked {
            return (self.data >> ((reserveIndex << 1) + 1)) & 1 != 0;
        }
    }

    /// @notice Fetches the liquidation threshold of a reserve
    /// @param self The reserve configuration
    /// @return liquidationThreshold The liquidation threshold of the reserve
    function getLiquidationThreshold(DataTypes.ReserveConfigurationMap memory self) internal pure returns (uint256) {
        return (self.data & ~LIQUIDATION_THRESHOLD_MASK) >> LIQUIDATION_THRESHOLD_START_BIT_POSITION;
    }

    /// @notice Fetches the liquidation bonus of a reserve
    /// @param self The reserve configuration
    /// @return liquidationBonus The liquidation bonus of the reserve
    function getLiquidationBonus(DataTypes.ReserveConfigurationMap memory self) internal pure returns (uint256) {
        return (self.data & ~LIQUIDATION_BONUS_MASK) >> LIQUIDATION_BONUS_START_BIT_POSITION;
    }

    /// @notice Fetches the borrow cap of a reserve
    /// @param self The reserve configuration
    /// @return borrowCap The borrow cap of the reserve
    function getBorrowCap(DataTypes.ReserveConfigurationMap memory self) internal pure returns (uint256) {
        return (self.data & ~BORROW_CAP_MASK) >> BORROW_CAP_START_BIT_POSITION;
    }

    /// @notice Fetches the supply cap of a reserve
    /// @param self The reserve configuration
    /// @return supplyCap The supply cap of the reserve
    function getSupplyCap(DataTypes.ReserveConfigurationMap memory self) internal pure returns (uint256) {
        return (self.data & ~SUPPLY_CAP_MASK) >> SUPPLY_CAP_START_BIT_POSITION;
    }

    /// @notice Fetches if borrowing is enabled for a reserve
    /// @param self The reserve configuration
    /// @return borrowingEnabled True if borrowing is enabled
    function getBorrowingEnabled(DataTypes.ReserveConfigurationMap memory self) internal pure returns (bool) {
        return (self.data & ~BORROWING_MASK) != 0;
    }

    /// @notice Fetches if borrowing is enabled for a reserve in isolation mode
    /// @param self The reserve configuration
    /// @return borrowableInIsolation True if borrowing is enabled in isolation mode
    function getBorrowableInIsolation(DataTypes.ReserveConfigurationMap memory self) internal pure returns (bool) {
        return (self.data & ~BORROWABLE_IN_ISOLATION_MASK) != 0;
    }

    /**
     * @notice Gets the debt ceiling for the asset if the asset is in isolation mode
     * @param self The reserve configuration
     * @return The debt ceiling (0 = isolation mode disabled)
     *
     */
    function getDebtCeiling(DataTypes.ReserveConfigurationMap memory self) internal pure returns (uint256) {
        return (self.data & ~DEBT_CEILING_MASK) >> DEBT_CEILING_START_BIT_POSITION;
    }

    /// @notice Checks if a reserve is siloed for borrowing
    /// @param _market Address of LendingPoolAddressesProvider for specific market
    /// @param _tokenAddr Address of the token
    /// @return isSiloedForBorrowing True if the reserve is siloed for borrowing
    function isSiloedForBorrowing(address _market, address _tokenAddr) internal view returns (bool) {
        IAaveProtocolDataProvider dataProvider = getDataProvider(_market);
        return dataProvider.getSiloedBorrowing(_tokenAddr);
    }

    /// @notice Fetches if flash loans are enabled for a reserve
    function getFlashLoanEnabled(DataTypes.ReserveConfigurationMap memory self) internal pure returns (bool) {
        return (self.data & ~FLASHLOAN_ENABLED_MASK) != 0;
    }

    /**
     * @notice Gets the configuration flags of the reserve
     * @param self The reserve configuration
     * @return The state flag representing active
     * @return The state flag representing frozen
     * @return The state flag representing borrowing enabled
     * @return The state flag representing paused
     */
    function getFlags(DataTypes.ReserveConfigurationMap memory self) internal pure returns (bool, bool, bool, bool) {
        uint256 dataLocal = self.data;

        return (
            (dataLocal & ~ACTIVE_MASK) != 0,
            (dataLocal & ~FROZEN_MASK) != 0,
            (dataLocal & ~BORROWING_MASK) != 0,
            (dataLocal & ~PAUSED_MASK) != 0
        );
    }

    /// @notice Fetches the next variable borrow index
    function _getNextVariableBorrowIndex(DataTypes.ReserveData memory _reserve)
        internal
        view
        returns (uint128 variableBorrowIndex)
    {
        uint256 scaledVariableDebt = IScaledBalanceToken(_reserve.variableDebtTokenAddress).scaledTotalSupply();
        variableBorrowIndex = _reserve.variableBorrowIndex;
        if (scaledVariableDebt > 0) {
            uint256 cumulatedVariableBorrowInterest =
                MathUtils.calculateCompoundedInterest(_reserve.currentVariableBorrowRate, _reserve.lastUpdateTimestamp);
            variableBorrowIndex = uint128(cumulatedVariableBorrowInterest.rayMul(variableBorrowIndex));
        }
    }
}
