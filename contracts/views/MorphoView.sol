// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "../interfaces/morpho/IMorpho.sol";
import "../interfaces/morpho/MorphoTypes.sol";
import "../actions/morpho/helpers/MorphoHelper.sol";
import "../DS/DSMath.sol";

contract MorphoView is MorphoHelper, DSMath {
    struct TokenBalance {
        address tokenAddr;
        uint256 totalSupplied;
        uint256 totalBorrowed;
    }

    function getMarketInfo() external view returns (Types.Market[] memory marketInfo) {
        address[] memory allMarkets = IMorpho(MORPHO_ADDR).getMarketsCreated();
        marketInfo = new Types.Market[](allMarkets.length);

        for (uint256 i; i < allMarkets.length; i++) marketInfo[i] = IMorpho(MORPHO_ADDR).market(allMarkets[i]);
    }

    function getUserInfo(address _usr) external view returns (TokenBalance[] memory tokenBalances) {
        address[] memory allMarkets = IMorpho(MORPHO_ADDR).getMarketsCreated();
        tokenBalances = new TokenBalance[](allMarkets.length);
        
        uint256 c;
        for (uint256 i; i < allMarkets.length; i++) {
            address aToken = allMarkets[i];
            Types.SupplyBalance memory supplyBalance = IMorpho(MORPHO_ADDR).supplyBalanceInOf(aToken, _usr);
            Types.BorrowBalance memory borrowBalance = IMorpho(MORPHO_ADDR).borrowBalanceInOf(aToken, _usr);

            if (supplyBalance.inP2P + supplyBalance.onPool
            + borrowBalance.inP2P + borrowBalance.onPool == 0) continue;

            address tokenAddr = IMorpho(MORPHO_ADDR).market(aToken).underlyingToken;
            uint256 p2pSupplyIndex = IMorpho(MORPHO_ADDR).p2pSupplyIndex(aToken);
            uint256 p2pBorrowIndex = IMorpho(MORPHO_ADDR).p2pBorrowIndex(aToken);
            Types.PoolIndexes memory poolIndexes = IMorpho(MORPHO_ADDR).poolIndexes(aToken);

            tokenBalances[c++] = TokenBalance({
                tokenAddr: tokenAddr,
                totalSupplied: rmul(supplyBalance.inP2P, p2pSupplyIndex) + rmul(supplyBalance.onPool, poolIndexes.poolSupplyIndex),
                totalBorrowed: rmul(borrowBalance.inP2P, p2pBorrowIndex) + rmul(borrowBalance.onPool, poolIndexes.poolBorrowIndex)
            });
        }

        assembly {
            mstore(tokenBalances, c)
        }
    }
}