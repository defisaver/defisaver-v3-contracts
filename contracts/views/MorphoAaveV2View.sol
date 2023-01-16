// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "../interfaces/aave/IAToken.sol";
import "../interfaces/morpho/IMorpho.sol";
import "../interfaces/morpho/IMorphoAaveV2Lens.sol";
import "../interfaces/morpho/MorphoTypes.sol";
import "../actions/morpho/helpers/MorphoHelper.sol";
import "../DS/DSMath.sol";

contract MorphoAaveV2View is MorphoHelper, DSMath {
    struct MarketInfo {
        address market; // aToken
        address underlying;
        uint256 p2pSupplyRate;
        uint256 p2pBorrowRate;
        uint256 poolSupplyRate;
        uint256 poolBorrowRate;
        Types.MarketPauseStatus pauseStatus;
    }

    struct UserInfo {
        uint256 userHealthFactor;
        UserBalance[] userBalances;
    }

    struct UserBalance {
        address market;
        address underlying;
        uint256 userSupplyRate;
        uint256 userBorrowRate;
        uint256 supplyBalanceInP2P;
        uint256 supplyBalanceOnPool;
        uint256 borrowBalanceInP2P;
        uint256 borrowBalanceOnPool;
    }

    function getMarketInfo() external view returns (
        MarketInfo[] memory marketInfo
    ) {
        address[] memory markets = IMorpho(MORPHO_AAVEV2_ADDR).getMarketsCreated();
        marketInfo = new MarketInfo[](markets.length);

        for (uint256 i; i < markets.length; i++) {
            (
                uint256 p2pSupplyRate,
                uint256 p2pBorrowRate,
                uint256 poolSupplyRate,
                uint256 poolBorrowRate
            ) = IMorphoAaveV2Lens(MORPHO_AAVEV2_LENS_ADDR).getRatesPerYear(markets[i]);
            marketInfo[i] = MarketInfo({
                market: markets[i],
                underlying: IAToken(markets[i]).UNDERLYING_ASSET_ADDRESS(),
                p2pSupplyRate: p2pSupplyRate,
                p2pBorrowRate: p2pBorrowRate,
                poolSupplyRate: poolSupplyRate,
                poolBorrowRate: poolBorrowRate,
                pauseStatus: IMorphoAaveV2Lens(MORPHO_AAVEV2_LENS_ADDR).getMarketPauseStatus(markets[i])
            });
        }
    }

    function getUserInfo(address _usr) external view returns (
        UserInfo memory userInfo
    ) {
        address[] memory markets = IMorphoAaveV2Lens(MORPHO_AAVEV2_LENS_ADDR).getEnteredMarkets(_usr);
        userInfo = UserInfo({
            userHealthFactor: IMorphoAaveV2Lens(MORPHO_AAVEV2_LENS_ADDR).getUserHealthFactor(_usr),
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

            userInfo.userBalances[i] = UserBalance({
                market: markets[i],
                underlying: IAToken(markets[i]).UNDERLYING_ASSET_ADDRESS(),
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