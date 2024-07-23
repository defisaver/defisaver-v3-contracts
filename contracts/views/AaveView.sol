// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { WadRayMath } from "../utils/math/WadRayMath.sol";
import { MathUtils } from "../utils/math/MathUtils.sol";
import { IStableDebtToken } from "../interfaces/aave/IStableDebtToken.sol";
import { IScaledBalanceToken } from "../interfaces/aave/IScaledBalanceToken.sol";
import { IReserveInterestRateStrategyV2 } from "../interfaces/aaveV2/IReserveInterestRateStrategyV2.sol";
import { DSMath } from "../DS/DSMath.sol";
import { AaveHelper } from "../actions/aave/helpers/AaveHelper.sol";
import { IPriceOracleGetterAave } from "../interfaces/aaveV2/IPriceOracleGetterAave.sol";
import { IAaveProtocolDataProviderV2 } from "../interfaces/aaveV2/IAaveProtocolDataProviderV2.sol";
import { ILendingPoolV2, DataTypes } from "../interfaces/aaveV2/ILendingPoolV2.sol";
import { ILendingPoolAddressesProviderV2 } from "../interfaces/aaveV2/ILendingPoolAddressesProviderV2.sol";
import { TokenUtils } from "../utils/TokenUtils.sol";
import { IERC20 } from "../interfaces/IERC20.sol";

contract AaveView is AaveHelper, DSMath{

    uint256 constant RESERVE_FACTOR_MASK = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF0000FFFFFFFFFFFFFFFF; // prettier-ignore
    uint256 constant RESERVE_FACTOR_START_BIT_POSITION = 64;

    using TokenUtils for address;
    using WadRayMath for uint256;

    struct LoanData {
        address user;
        uint128 ratio;
        address[] collAddr;
        bool[] enabledAsColl;
        address[] borrowAddr;
        uint256[] collAmounts;
        uint256[] borrowStableAmounts;
        uint256[] borrowVariableAmounts;
    }

    struct TokenInfo {
        address aTokenAddress;
        address underlyingTokenAddress;
        uint256 collateralFactor;
        uint256 price;
    }

    struct TokenInfoFull {
        address aTokenAddress;
        address underlyingTokenAddress;
        uint256 supplyRate;
        uint256 borrowRateVariable;
        uint256 borrowRateStable;
        uint256 totalSupply;
        uint256 availableLiquidity;
        uint256 totalBorrow;
        uint256 collateralFactor;
        uint256 liquidationRatio;
        uint256 price;
        uint256 totalBorrowVar;	
        uint256 totalBorrowStab;
        bool isActive;
        bool isFrozen;
        bool usageAsCollateralEnabled;
        bool borrowingEnabled;
        bool stableBorrowRateEnabled;
    }

    struct ReserveData {
        uint256 availableLiquidity;
        uint256 totalStableDebt;
        uint256 totalVariableDebt;
        uint256 liquidityRate;
        uint256 variableBorrowRate;
        uint256 stableBorrowRate;
    }

    struct UserToken {
        address token;
        uint256 balance;
        uint256 borrowsStable;
        uint256 borrowsVariable;
        uint256 stableBorrowRate;
        bool enabledAsCollateral;
    }

    /// @notice Params for supply and borrow rate estimation
    /// @param reserveAddress Address of the reserve
    /// @param liquidityAdded Amount of liquidity added (supply/repay)
    /// @param liquidityTaken Amount of liquidity taken (borrow/withdraw)
    /// @param isDebtAsset isDebtAsset if operation is borrow/payback
    struct LiquidityChangeParams {
        address reserveAddress;
        uint256 liquidityAdded;
        uint256 liquidityTaken;
        bool isDebtAsset;
    }

    struct EstimatedRates {
        address reserveAddress;
        uint256 supplyRate;
        uint256 variableBorrowRate;
    }

    function getSafetyRatio(address _market, address _user) public view returns(uint256) {
        ILendingPoolV2 lendingPool = ILendingPoolV2(ILendingPoolAddressesProviderV2(_market).getLendingPool());
        
        (,uint256 totalDebtETH,uint256 availableBorrowsETH,,,) = lendingPool.getUserAccountData(_user);

        if (totalDebtETH == 0) return uint256(0);

        return wdiv(totalDebtETH + availableBorrowsETH, totalDebtETH);
    }

    /// @notice Calculated the ratio of coll/debt for a compound user
    /// @param _market Address of LendingPoolAddressesProvider for specific market
    /// @param _user Address of the user
    function getRatio(address _market, address _user) public view returns (uint256) {
        // For each asset the account is in
        return getSafetyRatio(_market, _user);
    }

    /// @notice Fetches Aave prices for tokens
    /// @param _market Address of LendingPoolAddressesProvider for specific market
    /// @param _tokens Arr. of tokens for which to get the prices
    /// @return prices Array of prices
    function getPrices(address _market, address[] memory _tokens) public view returns (uint256[] memory prices) {
        address priceOracleAddress = ILendingPoolAddressesProviderV2(_market).getPriceOracle();
        prices = IPriceOracleGetterAave(priceOracleAddress).getAssetsPrices(_tokens);
    }

    /// @notice Fetches Aave collateral factors for tokens
    /// @param _market Address of LendingPoolAddressesProvider for specific market
    /// @param _tokens Arr. of tokens for which to get the coll. factors
    /// @return collFactors Array of coll. factors
    function getCollFactors(address _market, address[] memory _tokens) public view returns (uint256[] memory collFactors) {
        IAaveProtocolDataProviderV2 dataProvider = getDataProvider(_market);
        collFactors = new uint256[](_tokens.length);

        for (uint256 i = 0; i < _tokens.length; ++i) {
            (,collFactors[i],,,,,,,,) = dataProvider.getReserveConfigurationData(_tokens[i]);
        }
    }

    function getTokenBalances(address _market, address _user, address[] memory _tokens) public view returns (UserToken[] memory userTokens) {
        IAaveProtocolDataProviderV2 dataProvider = getDataProvider(_market);

        userTokens = new UserToken[](_tokens.length);

        for (uint256 i = 0; i < _tokens.length; i++) {
            address asset = _tokens[i];
            userTokens[i].token = asset;

            (userTokens[i].balance, userTokens[i].borrowsStable, userTokens[i].borrowsVariable,,,userTokens[i].stableBorrowRate,,,userTokens[i].enabledAsCollateral) = dataProvider.getUserReserveData(asset, _user);
        }
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

    /// @notice Information about reserves
    /// @param _market Address of LendingPoolAddressesProvider for specific market
    /// @param _tokenAddresses Array of tokens addresses
    /// @return tokens Array of reserves information
    function getTokensInfo(address _market, address[] memory _tokenAddresses) public view returns(TokenInfo[] memory tokens) {
        IAaveProtocolDataProviderV2 dataProvider = getDataProvider(_market);
        address priceOracleAddress = ILendingPoolAddressesProviderV2(_market).getPriceOracle();

        tokens = new TokenInfo[](_tokenAddresses.length);

        for (uint256 i = 0; i < _tokenAddresses.length; ++i) {
            (,uint256 ltv,,,,,,,,) = dataProvider.getReserveConfigurationData(_tokenAddresses[i]);
            (address aToken,,) = dataProvider.getReserveTokensAddresses(_tokenAddresses[i]);

            tokens[i] = TokenInfo({
                aTokenAddress: aToken,
                underlyingTokenAddress: _tokenAddresses[i],
                collateralFactor: ltv,
                price: IPriceOracleGetterAave(priceOracleAddress).getAssetPrice(_tokenAddresses[i])
            });
        }
    }

    function getTokenInfoFull(IAaveProtocolDataProviderV2 _dataProvider, address _priceOracleAddress, address _token) public view returns(TokenInfoFull memory _tokenInfo) {
        (
            , // uint256 decimals
            uint256 ltv,
            uint256 liquidationThreshold,
            , //   uint256 liquidationBonus
            , //   uint256 reserveFactor
            bool usageAsCollateralEnabled,
            bool borrowingEnabled,
            bool stableBorrowRateEnabled,
            bool isActive,
            bool isFrozen
        ) = _dataProvider.getReserveConfigurationData(_token);

        ReserveData memory t;

        (
            t.availableLiquidity,
            t.totalStableDebt,
            t.totalVariableDebt,
            t.liquidityRate,
            t.variableBorrowRate,
            t.stableBorrowRate,
            ,
            ,
            ,

        ) = _dataProvider.getReserveData(_token);

        (address aToken,,) = _dataProvider.getReserveTokensAddresses(_token);

        uint price = IPriceOracleGetterAave(_priceOracleAddress).getAssetPrice(_token);

        _tokenInfo = TokenInfoFull({
            aTokenAddress: aToken,
            underlyingTokenAddress: _token,
            supplyRate: t.liquidityRate,
            borrowRateVariable: t.variableBorrowRate,
            borrowRateStable: t.stableBorrowRate,
            totalSupply: IERC20(aToken).totalSupply(),
            availableLiquidity: t.availableLiquidity,
            totalBorrow: t.totalVariableDebt+t.totalStableDebt,
            collateralFactor: ltv,
            liquidationRatio: liquidationThreshold,
            price: price,
            totalBorrowVar: t.totalVariableDebt,	
            totalBorrowStab: t.totalStableDebt,
            isActive: isActive,
            isFrozen: isFrozen,
            usageAsCollateralEnabled: usageAsCollateralEnabled,
            borrowingEnabled: borrowingEnabled,
            stableBorrowRateEnabled: stableBorrowRateEnabled
        });
    }

    /// @notice Information about reserves
    /// @param _market Address of LendingPoolAddressesProvider for specific market
    /// @param _tokenAddresses Array of token addresses
    /// @return tokens Array of reserves information
    function getFullTokensInfo(address _market, address[] memory _tokenAddresses) public view returns(TokenInfoFull[] memory tokens) {
        IAaveProtocolDataProviderV2 dataProvider = getDataProvider(_market);
        address priceOracleAddress = ILendingPoolAddressesProviderV2(_market).getPriceOracle();

        tokens = new TokenInfoFull[](_tokenAddresses.length);

        for (uint256 i = 0; i < _tokenAddresses.length; ++i) {
            tokens[i] = getTokenInfoFull(dataProvider, priceOracleAddress, _tokenAddresses[i]);
        }
    }


    /// @notice Fetches all the collateral/debt address and amounts, denominated in ether
    /// @param _market Address of LendingPoolAddressesProvider for specific market
    /// @param _user Address of the user
    /// @return data LoanData information
    function getLoanData(address _market, address _user) public view returns (LoanData memory data) {
        IAaveProtocolDataProviderV2 dataProvider = getDataProvider(_market);
        address priceOracleAddress = ILendingPoolAddressesProviderV2(_market).getPriceOracle();

        IAaveProtocolDataProviderV2.TokenData[] memory reserves = dataProvider.getAllReservesTokens();

        data = LoanData({
            user: _user,
            ratio: 0,
            collAddr: new address[](reserves.length),
            enabledAsColl: new bool[](reserves.length),
            borrowAddr: new address[](reserves.length),
            collAmounts: new uint[](reserves.length),
            borrowStableAmounts: new uint[](reserves.length),
            borrowVariableAmounts: new uint[](reserves.length)
        });

        uint64 collPos = 0;
        uint64 borrowPos = 0;

        for (uint64 i = 0; i < reserves.length; i++) {
            address reserve = reserves[i].tokenAddress;

            (uint256 aTokenBalance, uint256 borrowsStable, uint256 borrowsVariable,,,,,,bool usageAsCollateralEnabled) = dataProvider.getUserReserveData(reserve, _user);
            uint256 price = IPriceOracleGetterAave(priceOracleAddress).getAssetPrice(reserve);

            if (aTokenBalance > 0) {
                uint256 userTokenBalanceEth = wmul(aTokenBalance, price) * (10 ** (18 - reserve.getTokenDecimals()));
                data.collAddr[collPos] = reserve;
                data.collAmounts[collPos] = userTokenBalanceEth;
                data.enabledAsColl[collPos] = usageAsCollateralEnabled;
                collPos++;
            }

            // Sum up debt in Eth
            if (borrowsStable > 0) {
                uint256 userBorrowBalanceEth = wmul(borrowsStable, price) * (10 ** (18 - reserve.getTokenDecimals()));
                data.borrowAddr[borrowPos] = reserve;
                data.borrowStableAmounts[borrowPos] = userBorrowBalanceEth;
            }

            // Sum up debt in Eth
            if (borrowsVariable > 0) {
                uint256 userBorrowBalanceEth = wmul(borrowsVariable, price) * (10 ** (18 - reserve.getTokenDecimals()));
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

    function getUserUnclaimedRewards(address _user) external view returns (uint256) {
        return AaveIncentivesController.getUserUnclaimedRewards(_user);
    }

    function getIncentivesRewardsBalance(
        address[] calldata _assets,
        address _user
    ) external view returns (uint256) {
        return AaveIncentivesController.getRewardsBalance(_assets, _user);
    }

    function getStakingRewardsBalance(address _staker) external view returns (uint256) {
        return StakedToken.getTotalRewardsBalance(_staker);
    }

    function getReserveFactor(DataTypes.ReserveConfigurationMap memory self)
        internal
        pure
        returns (uint256)
    {
        return (self.data & ~RESERVE_FACTOR_MASK) >> RESERVE_FACTOR_START_BIT_POSITION;
    }

    function getApyAfterValuesEstimation(address _market, LiquidityChangeParams[] memory _reserveParams)
        public view returns (EstimatedRates[] memory)
    {
        ILendingPoolV2 lendingPool = ILendingPoolV2(ILendingPoolAddressesProviderV2(_market).getLendingPool());
        EstimatedRates[] memory estimatedRates = new EstimatedRates[](_reserveParams.length);
        for (uint256 i = 0; i < _reserveParams.length; ++i) {
            DataTypes.ReserveData memory reserve = lendingPool.getReserveData(_reserveParams[i].reserveAddress);

            EstimatedRates memory estimatedRate;
            estimatedRate.reserveAddress = _reserveParams[i].reserveAddress;
            estimatedRate.supplyRate = reserve.currentLiquidityRate;
            estimatedRate.variableBorrowRate = reserve.currentVariableBorrowRate;

            if (_reserveParams[i].liquidityAdded == 0 && _reserveParams[i].liquidityTaken == 0) {
                estimatedRates[i] = estimatedRate;
                continue;
            }

            (uint256 totalStableDebt, uint256 avgStableRate) = IStableDebtToken(reserve.stableDebtTokenAddress)
                .getTotalSupplyAndAvgRate();

            uint256 nextVariableBorrowIndex = _getNextVariableBorrowIndex(reserve);
            uint256 variableDebt = IScaledBalanceToken(reserve.variableDebtTokenAddress).scaledTotalSupply();
            
            uint256 totalVariableDebt = variableDebt.rayMul(nextVariableBorrowIndex);
            
            if (_reserveParams[i].isDebtAsset) {
                totalVariableDebt += _reserveParams[i].liquidityTaken;
                totalVariableDebt = _reserveParams[i].liquidityAdded >= totalVariableDebt ? 0
                    : totalVariableDebt - _reserveParams[i].liquidityAdded;
            }

            uint256 availableLiquidity = IERC20(_reserveParams[i].reserveAddress)
                .balanceOf(reserve.aTokenAddress)
                + _reserveParams[i].liquidityAdded
                - _reserveParams[i].liquidityTaken;
            
            (
               estimatedRate.supplyRate,
               ,
               estimatedRate.variableBorrowRate
            ) = IReserveInterestRateStrategyV2(reserve.interestRateStrategyAddress).calculateInterestRates(
                _reserveParams[i].reserveAddress,
                availableLiquidity,
                totalStableDebt,
                totalVariableDebt,
                avgStableRate,
                getReserveFactor(reserve.configuration)
            );

            estimatedRates[i] = estimatedRate;
        }

        return estimatedRates;        
    }

    function _getNextVariableBorrowIndex(DataTypes.ReserveData memory _reserve) internal view returns (uint128 variableBorrowIndex) {
        uint256 scaledVariableDebt = IScaledBalanceToken(_reserve.variableDebtTokenAddress).scaledTotalSupply();
        variableBorrowIndex = _reserve.variableBorrowIndex;
        if (_reserve.currentLiquidityRate > 0 && scaledVariableDebt != 0) {
            uint256 cumulatedVariableBorrowInterest = MathUtils.calculateCompoundedInterest(
                _reserve.currentVariableBorrowRate,
                _reserve.lastUpdateTimestamp
            );
            variableBorrowIndex = uint128(cumulatedVariableBorrowInterest.rayMul(variableBorrowIndex));
        }
    }
}
