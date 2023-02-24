// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "../interfaces/aave/IAToken.sol";
import "../interfaces/morpho/IMorpho.sol";
import "../interfaces/morpho/IMorphoAaveV2Lens.sol";
import "../interfaces/morpho/IRewardsDistributor.sol";
import "../interfaces/morpho/MorphoTypes.sol";
import "../actions/morpho/helpers/MorphoHelper.sol";
import "../DS/DSMath.sol";
import "./AaveView.sol";

contract MorphoAaveV2View is MorphoHelper {
    address constant public AAVE_VIEW_ADDR = 0xEDf1087544a01596b70Da746F861B878F245B08f;

    struct MarketInfo {
        address market; // aToken
        address underlying;
        uint256 decimals;
        uint256 p2pSupplyAmount;
        uint256 poolSupplyAmount;
        uint256 p2pBorrowAmount;
        uint256 poolBorrowAmount;
        uint256 p2pSupplyRate;
        uint256 p2pBorrowRate;
        uint256 poolSupplyRate;
        uint256 poolBorrowRate;
        uint256 reserveFactor;
        Types.MarketPauseStatus pauseStatus;
    }

    struct UserInfo {
        uint256 userHealthFactor;
        uint256 morphoClaimed;
        UserBalance[] userBalances;
    }

    struct UserBalance {
        address market;
        address underlying;
        uint256 decimals;
        uint256 userSupplyRate;
        uint256 userBorrowRate;
        uint256 supplyBalanceInP2P;
        uint256 supplyBalanceOnPool;
        uint256 borrowBalanceInP2P;
        uint256 borrowBalanceOnPool;
    }

    function getMarketInfo(address _market) public view returns (MarketInfo memory) {
        address underlying = IAToken(_market).UNDERLYING_ASSET_ADDRESS();

        (uint256 p2pSupplyAmount, uint256 poolSupplyAmount) = IMorphoAaveV2Lens(MORPHO_AAVEV2_LENS_ADDR).getTotalMarketSupply(_market);
        (uint256 p2pBorrowAmount, uint256 poolBorrowAmount) = IMorphoAaveV2Lens(MORPHO_AAVEV2_LENS_ADDR).getTotalMarketBorrow(_market);
        (
            uint256 p2pSupplyRate,
            uint256 p2pBorrowRate,
            uint256 poolSupplyRate,
            uint256 poolBorrowRate
        ) = IMorphoAaveV2Lens(MORPHO_AAVEV2_LENS_ADDR).getRatesPerYear(_market);
        uint256 reserveFactor = IMorpho(MORPHO_AAVEV2_ADDR).market(_market).reserveFactor;

        return MarketInfo({
            market: _market,
            underlying: underlying,
            decimals: IERC20(underlying).decimals(),
            p2pSupplyAmount: p2pSupplyAmount,
            poolSupplyAmount: poolSupplyAmount,
            p2pBorrowAmount: p2pBorrowAmount,
            poolBorrowAmount: poolBorrowAmount,
            p2pSupplyRate: p2pSupplyRate,
            p2pBorrowRate: p2pBorrowRate,
            poolSupplyRate: poolSupplyRate,
            poolBorrowRate: poolBorrowRate,
            reserveFactor: reserveFactor,
            pauseStatus: IMorphoAaveV2Lens(MORPHO_AAVEV2_LENS_ADDR).getMarketPauseStatus(_market)
        });
    }

    function getAllMarketsInfo() external view returns (
        MarketInfo[] memory marketInfo,
        AaveView.TokenInfoFull[] memory aaveTokenInfo
    ) {
        address[] memory markets = IMorpho(MORPHO_AAVEV2_ADDR).getMarketsCreated();
        address[] memory underlyingTokens = new address[](markets.length);
        marketInfo = new MarketInfo[](markets.length);

        for (uint256 i; i < markets.length; i++) {
            marketInfo[i] = getMarketInfo(markets[i]);
            underlyingTokens[i] = marketInfo[i].underlying;
        }

        address addressesProvider = IMorpho(MORPHO_AAVEV2_ADDR).addressesProvider();
        aaveTokenInfo = AaveView(AAVE_VIEW_ADDR).getFullTokensInfo(addressesProvider, underlyingTokens);
    }

    function getUserInfo(address _usr) external view returns (
        UserInfo memory userInfo
    ) {
        address[] memory markets = IMorphoAaveV2Lens(MORPHO_AAVEV2_LENS_ADDR).getEnteredMarkets(_usr);
        userInfo = UserInfo({
            userHealthFactor: IMorphoAaveV2Lens(MORPHO_AAVEV2_LENS_ADDR).getUserHealthFactor(_usr),
            morphoClaimed: IRewardsDistributor(REWARDS_DISTRIBUTOR_ADDR).claimed(_usr),
            userBalances: new UserBalance[](markets.length)
        });
        
        for (uint256 i; i < markets.length; i++) {
            (
                uint256 supplyBalanceInP2P,
                uint256 supplyBalanceOnPool,
            ) =  IMorphoAaveV2Lens(MORPHO_AAVEV2_LENS_ADDR).getCurrentSupplyBalanceInOf(markets[i], _usr);
            (
                uint256 borrowBalanceInP2P,
                uint256 borrowBalanceOnPool,
            ) =  IMorphoAaveV2Lens(MORPHO_AAVEV2_LENS_ADDR).getCurrentBorrowBalanceInOf(markets[i], _usr);

            address underlying = IAToken(markets[i]).UNDERLYING_ASSET_ADDRESS();
            userInfo.userBalances[i] = UserBalance({
                market: markets[i],
                underlying: underlying,
                decimals: IERC20(underlying).decimals(),
                userSupplyRate: IMorphoAaveV2Lens(MORPHO_AAVEV2_LENS_ADDR).getCurrentUserSupplyRatePerYear(markets[i], _usr),
                userBorrowRate: IMorphoAaveV2Lens(MORPHO_AAVEV2_LENS_ADDR).getCurrentUserBorrowRatePerYear(markets[i], _usr),
                supplyBalanceInP2P: supplyBalanceInP2P,
                supplyBalanceOnPool: supplyBalanceOnPool,
                borrowBalanceInP2P: borrowBalanceInP2P,
                borrowBalanceOnPool: borrowBalanceOnPool
            });
        }
    }
}