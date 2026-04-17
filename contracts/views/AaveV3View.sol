// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IAaveV3Oracle } from "../interfaces/protocols/aaveV3/IAaveV3Oracle.sol";
import { IPoolV3 } from "../interfaces/protocols/aaveV3/IPoolV3.sol";
import { IPoolAddressesProvider } from "../interfaces/protocols/aaveV3/IPoolAddressesProvider.sol";
import {
    IAaveProtocolDataProvider
} from "../interfaces/protocols/aaveV3/IAaveProtocolDataProvider.sol";
import {
    IReserveInterestRateStrategy
} from "../interfaces/protocols/aaveV3/IReserveInterestRateStrategy.sol";
import { IScaledBalanceToken } from "../interfaces/protocols/aave/IScaledBalanceToken.sol";
import { IUmbrella } from "../interfaces/protocols/aaveV3/IUmbrella.sol";
import { IERC20 } from "../interfaces/token/IERC20.sol";
import { IERC4626 } from "../interfaces/token/IERC4626.sol";
import { IERC4626StakeToken } from "../interfaces/protocols/aaveV3/IERC4626StakeToken.sol";
import {
    IUmbrellaRewardsController
} from "../interfaces/protocols/aaveV3/IUmbrellaRewardsController.sol";
import { IStaticATokenV2 } from "../interfaces/protocols/aaveV3/IStaticATokenV2.sol";
import { IDebtToken } from "../interfaces/protocols/aaveV3/IDebtToken.sol";

import { DataTypes } from "../interfaces/protocols/aaveV3/DataTypes.sol";
import { ReserveConfiguration } from "../_vendor/aave/v3/ReserveConfiguration.sol";
import { UserConfiguration } from "../_vendor/aave/v3/UserConfiguration.sol";
import { WadRayMath } from "../_vendor/aave/WadRayMath.sol";
import { MathUtils } from "../_vendor/aave/MathUtils.sol";
import { AaveV3Helper } from "../actions/aaveV3/helpers/AaveV3Helper.sol";
import { AaveV3RatioHelper } from "../actions/aaveV3/helpers/AaveV3RatioHelper.sol";
import { TokenUtils } from "../utils/token/TokenUtils.sol";

/// @title Helper contract to aggregate data from AaveV3 protocol
contract AaveV3View is AaveV3Helper, AaveV3RatioHelper {
    using TokenUtils for address;
    using WadRayMath for uint256;
    using ReserveConfiguration for DataTypes.ReserveConfigurationMap;
    using UserConfiguration for DataTypes.UserConfigurationMap;

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
        uint256[] borrowStableAmounts; // Note: deprecated in v3.2, left for backwards compatibility
        uint256[] borrowVariableAmounts;
        // emode category data
        uint16 ltv;
        uint16 liquidationThreshold;
        uint16 liquidationBonus;
        address priceSource; // Note: deprecated, left for backwards compatibility
        string label; // Note: deprecated, left for backwards compatibility
    }

    /// @notice User token data
    struct UserToken {
        address token;
        uint256 balance;
        uint256 borrowsStable; // Note: deprecated in v3.2, left for backwards compatibility
        uint256 borrowsVariable;
        uint256 stableBorrowRate; // Note: deprecated in v3.2, left for backwards compatibility
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
        uint256 borrowRateStable; // Note: deprecated in v3.2, left for backwards compatibility
        uint256 totalSupply; //total supply
        uint256 availableLiquidity; //reserveData.liq rate
        uint256 totalBorrow; // total supply of both debt assets
        uint256 totalBorrowVar;
        uint256 totalBorrowStab; // Note: deprecated in v3.2, left for backwards compatibility
        uint256 collateralFactor; //pool.config
        uint256 liquidationRatio; //pool.config
        uint256 price; //oracle
        uint256 supplyCap; //pool.config
        uint256 borrowCap; //pool.config
        uint256 emodeCategory; //pool.config
        uint256 debtCeilingForIsolationMode; // Note: deprecated in v3.7, left for backwards compatibility
        uint256 isolationModeTotalDebt; // Note: deprecated in v3.7, left for backwards compatibility
        bool usageAsCollateralEnabled; //usageAsCollateralEnabled = liquidationThreshold > 0;
        bool borrowingEnabled; //pool.config
        bool stableBorrowRateEnabled; // Note: deprecated in v3.2, left for backwards compatibility
        bool isolationModeBorrowingEnabled; // Note: deprecated in v3.7, left for backwards compatibility
        bool isSiloedForBorrowing; // Note: deprecated in v3.7, left for backwards compatibility
        uint256 eModeCollateralFactor; //pool.getEModeCategoryData.ltv
        bool isFlashLoanEnabled;
        // emode category data
        uint16 ltv; // Note: deprecated, left for backwards compatibility
        uint16 liquidationThreshold; // Note: deprecated, left for backwards compatibility
        uint16 liquidationBonus; // Note: deprecated, left for backwards compatibility
        address priceSource; // Note: deprecated, left for backwards compatibility
        string label; // Note: deprecated, left for backwards compatibility
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
    function getHealthFactor(address _market, address _user)
        public
        view
        returns (uint256 healthFactor)
    {
        IPoolV3 lendingPool = getLendingPool(_market);

        (,,,,, healthFactor) = lendingPool.getUserAccountData(_user);
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
            collFactors[i] = lendingPool.getConfiguration(_tokens[i]).getReserveFactor();
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
            userTokens[i].enabledAsCollateral =
                lendingPool.getUserConfiguration(_user).isUsingAsCollateral(reserveData.id);
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
            DataTypes.ReserveConfigurationMap memory config =
                lendingPool.getConfiguration(_tokenAddresses[i]);
            uint256 collFactor = config.getLtv();
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

        (bool isActive, bool isFrozen,, bool isPaused) = config.getFlags();

        _tokenInfo = TokenInfoFull({
            aTokenAddress: reserveData.aTokenAddress,
            underlyingTokenAddress: _tokenAddr,
            assetId: reserveData.id,
            supplyRate: reserveData.currentLiquidityRate,
            borrowRateVariable: reserveData.currentVariableBorrowRate,
            borrowRateStable: 0,
            totalSupply: IERC20(reserveData.aTokenAddress).totalSupply()
                + reserveData.accruedToTreasury,
            availableLiquidity: _tokenAddr.getBalance(reserveData.aTokenAddress),
            totalBorrow: totalVariableBorrow,
            totalBorrowVar: totalVariableBorrow,
            totalBorrowStab: 0,
            collateralFactor: config.getLtv(),
            liquidationRatio: config.getLiquidationThreshold(),
            price: getAssetPrice(_market, _tokenAddr),
            supplyCap: config.getSupplyCap(),
            borrowCap: config.getBorrowCap(),
            emodeCategory: 0,
            usageAsCollateralEnabled: config.getLiquidationThreshold() > 0,
            borrowingEnabled: config.getBorrowingEnabled(),
            stableBorrowRateEnabled: false, // deprecated in v3.2
            isolationModeBorrowingEnabled: false, // deprecated in v3.7
            debtCeilingForIsolationMode: 0, // deprecated in v3.7
            isolationModeTotalDebt: 0, // deprecated in v3.7
            isSiloedForBorrowing: false, // deprecated in v3.7
            eModeCollateralFactor: 0,
            isFlashLoanEnabled: config.getFlashLoanEnabled(),
            ltv: 0, // same as collateralFactor
            liquidationThreshold: 0, // same as liquidationRatio
            liquidationBonus: uint16(config.getLiquidationBonus()),
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
    function getAllEmodes(address _market)
        public
        view
        returns (DataTypes.EModeCategoryNew[] memory emodesData)
    {
        emodesData = new DataTypes.EModeCategoryNew[](256);
        IPoolV3 lendingPool = getLendingPool(_market);
        uint8 missCounter;
        for (uint8 i = 1; i < 256; i++) {
            DataTypes.EModeCategoryNew memory nextEmodeData = getEmodeData(lendingPool, i);
            if (nextEmodeData.liquidationThreshold != 0) {
                emodesData[i - 1] = nextEmodeData;
                missCounter = 0;
            } else {
                ++missCounter;
                // assumes there will never be a gap > 2 when setting eModes
                if (missCounter > 2) break;
            }
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
        DataTypes.CollateralConfig memory config =
            _lendingPool.getEModeCategoryCollateralConfig(_id);

        bool isolated;
        try _lendingPool.getIsEModeCategoryIsolated(_id) returns (bool _isolated) {
            isolated = _isolated;
        } catch (bytes memory) { /*lowLevelData*/ }

        string memory label = "";
        try _lendingPool.getEModeCategoryLabel(_id) returns (string memory _label) {
            label = _label;
        } catch (bytes memory) { /*lowLevelData*/ }

        uint128 ltvzeroBitmap;
        try _lendingPool.getEModeCategoryLtvzeroBitmap(_id) returns (uint128 _ltvzeroBitmap) {
            ltvzeroBitmap = _ltvzeroBitmap;
        } catch (bytes memory) { /*lowLevelData*/ }

        emodeData = DataTypes.EModeCategoryNew({
            ltv: config.ltv,
            liquidationThreshold: config.liquidationThreshold,
            liquidationBonus: config.liquidationBonus,
            collateralBitmap: _lendingPool.getEModeCategoryCollateralBitmap(_id),
            isolated: isolated,
            label: label,
            borrowableBitmap: _lendingPool.getEModeCategoryBorrowableBitmap(_id),
            ltvzeroBitmap: ltvzeroBitmap
        });
    }

    /// @notice Fetches all the collateral/debt address and amounts, denominated in ether
    /// @param _market Address of LendingPoolAddressesProvider for specific market
    /// @param _user Address of the user
    /// @return data LoanData information
    function getLoanData(address _market, address _user)
        public
        view
        returns (LoanData memory data)
    {
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
                        lendingPool.getUserConfiguration(_user).isUsingAsCollateral(reserveData.id);
                    uint256 userTokenBalanceEth =
                        (aTokenBalance * price) / (10 ** (reserve.getTokenDecimals()));
                    data.collAmounts[collPos] = userTokenBalanceEth;
                    collPos++;
                }
            }
            // Sum up debt in Usd
            uint256 borrowsVariable = reserveData.variableDebtTokenAddress.getBalance(_user);
            if (borrowsVariable > 0) {
                uint256 userBorrowBalanceEth =
                    (borrowsVariable * price) / (10 ** (reserve.getTokenDecimals()));
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

    function getLoanDataArr(address _market, address[] memory _users)
        public
        view
        returns (LoanData[] memory loans)
    {
        loans = new LoanData[](_users.length);

        for (uint256 i = 0; i < _users.length; ++i) {
            loans[i] = getLoanData(_market, _users[i]);
        }
    }

    /// @notice Fetches the price of a token
    /// @param _market Address of LendingPoolAddressesProvider for specific market
    /// @param _tokenAddr Address of the token
    /// @return price The price of the token
    function getAssetPrice(address _market, address _tokenAddr)
        public
        view
        returns (uint256 price)
    {
        address priceOracleAddress = IPoolAddressesProvider(_market).getPriceOracle();
        price = IAaveV3Oracle(priceOracleAddress).getAssetPrice(_tokenAddr);
    }

    /// @notice Fetches the e-mode collateral factor for a specific e-mode category
    /// @param emodeCategory ID of the e-mode category
    /// @param lendingPool Address of the lending pool
    /// @return eModeCollateralFactor The e-mode collateral factor for the specific category
    function getEModeCollateralFactor(uint256 emodeCategory, IPoolV3 lendingPool)
        public
        view
        returns (uint16)
    {
        DataTypes.EModeCategoryLegacy memory categoryData =
            lendingPool.getEModeCategoryData(uint8(emodeCategory));
        return categoryData.ltv;
    }

    /// @notice Checks if borrow is allowed for a market
    /// @param _market Address of LendingPoolAddressesProvider for specific market
    /// @return isBorrowAllowed True if borrow is allowed
    /// @dev Removed in v3.7 along with priceOracleSentinel, left for backwards compatibility
    function isBorrowAllowed(address _market) public view returns (bool) {
        return true;
    }

    /// @notice Fetches the apy after values estimation
    /// @param _market Address of LendingPoolAddressesProvider for specific market
    /// @param _reserveParams Array of liquidity change parameters
    /// @return estimatedRates Array of estimated rates
    function getApyAfterValuesEstimation(
        address _market,
        LiquidityChangeParams[] memory _reserveParams
    ) public view returns (EstimatedRates[] memory) {
        IPoolV3 lendingPool = getLendingPool(_market);
        EstimatedRates[] memory estimatedRates = new EstimatedRates[](_reserveParams.length);
        for (uint256 i = 0; i < _reserveParams.length; ++i) {
            address asset = _reserveParams[i].reserveAddress;
            DataTypes.ReserveData memory reserve = lendingPool.getReserveData(asset);

            uint256 totalVarDebt = IScaledBalanceToken(reserve.variableDebtTokenAddress)
                .scaledTotalSupply().rayMul(_getNextVariableBorrowIndex(reserve));

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
                        reserveFactor: reserve.configuration.getReserveFactor(),
                        reserve: asset,
                        usingVirtualBalance: true,
                        virtualUnderlyingBalance: lendingPool.getVirtualUnderlyingBalance(asset)
                    })
                );

            estimatedRates[i] = EstimatedRates({
                reserveAddress: asset,
                supplyRate: estimatedSupplyRate,
                variableBorrowRate: estimatedVariableBorrowRate
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
    function getEOAApprovalsAndBalances(
        address _asset,
        address _eoa,
        address _proxy,
        address _market
    ) public view returns (EOAApprovalData memory approvalData) {
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
            variableDebtDelegation: IDebtToken(reserveData.variableDebtTokenAddress)
                .borrowAllowance(_eoa, _proxy),
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
        retVal.waTokenToATokenRate =
            (waToken != GHO_TOKEN) ? IERC4626(waToken).convertToAssets(baseUnit) : baseUnit;

        IUmbrellaRewardsController rewardsController =
            IUmbrellaRewardsController(UMBRELLA_REWARDS_CONTROLLER_ADDRESS);

        address[] memory rewards = rewardsController.getAllRewards(_stkToken);

        uint256[] memory rewardsEmissionRates = new uint256[](rewards.length);
        for (uint256 i = 0; i < rewards.length; ++i) {
            rewardsEmissionRates[i] =
                rewardsController.calculateCurrentEmission(_stkToken, rewards[i]);
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

    /// @notice Fetches the next variable borrow index
    function _getNextVariableBorrowIndex(DataTypes.ReserveData memory _reserve)
        internal
        view
        returns (uint128 variableBorrowIndex)
    {
        uint256 scaledVariableDebt =
            IScaledBalanceToken(_reserve.variableDebtTokenAddress).scaledTotalSupply();
        variableBorrowIndex = _reserve.variableBorrowIndex;
        if (scaledVariableDebt > 0) {
            uint256 cumulatedVariableBorrowInterest = MathUtils.calculateCompoundedInterest(
                _reserve.currentVariableBorrowRate, _reserve.lastUpdateTimestamp
            );
            variableBorrowIndex =
                uint128(cumulatedVariableBorrowInterest.rayMul(variableBorrowIndex));
        }
    }
}
