// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "./MainnetMorphoBlueAddresses.sol";
import "../../../interfaces/morpho-blue/IMorphoBlue.sol";

contract MorphoBlueHelper is MainnetMorphoBlueAddresses {
    IMorphoBlue public constant morphoBlue = IMorphoBlue(MORPHO_BLUE_ADDRESS);
    
    uint256 internal constant MARKET_PARAMS_BYTES_LENGTH = 5 * 32;

    uint256 internal constant VIRTUAL_SHARES = 1e6;
    uint256 internal constant VIRTUAL_ASSETS = 1;

    function id(MarketParams memory marketParams) internal pure returns (Id marketParamsId) {
        assembly {
            marketParamsId := keccak256(marketParams, MARKET_PARAMS_BYTES_LENGTH)
        }
    }

    function getSupplySharesAfterAccrual(MarketParams memory marketParams, address owner) public returns (uint256 supplyShares){
        morphoBlue.accrueInterest(marketParams);
        Position memory position = morphoBlue.position(id(marketParams), owner);
        supplyShares = position.supplyShares;
    }
    
    function getBorrowSharesAfterAccrual(MarketParams memory marketParams, address owner) public returns (uint256 borrowShares){
        morphoBlue.accrueInterest(marketParams);
        Position memory position = morphoBlue.position(id(marketParams), owner);
        borrowShares = position.borrowShares;
    }

    function getAccruedMarketInfo(MarketParams memory marketParams) public returns (Market memory marketInfo){
        morphoBlue.accrueInterest(marketParams);
        marketInfo = morphoBlue.market(id(marketParams));
    }

    function sharesToAssetsUp(uint256 shares, uint256 totalAssets,  uint256 totalShares) internal pure returns (uint256){
        return mulDivUp(shares, totalAssets + VIRTUAL_ASSETS, totalShares + VIRTUAL_SHARES);
    }

    /// @dev Returns (`x` * `y`) / `d` rounded up.
    function mulDivUp(uint256 x, uint256 y, uint256 d) internal pure returns (uint256) {
        return (x * y + (d - 1)) / d;
    }

    function getCurrentDebt(MarketParams memory marketParams, address owner) public returns (uint256 currentDebtInAssets, uint256 borrowShares){
        Market memory marketInfo = getAccruedMarketInfo(marketParams);
        borrowShares = getBorrowSharesAfterAccrual(marketParams, owner);
        currentDebtInAssets = sharesToAssetsUp(borrowShares, marketInfo.totalBorrowAssets, marketInfo.totalBorrowShares);
    }
}