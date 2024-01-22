// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "./MainnetMorphoBlueAddresses.sol";
import "../../../interfaces/morpho-blue/IMorphoBlue.sol";
import "./MorphoBlueLib.sol";
import "../../../interfaces/morpho-blue/IOracle.sol";

contract MorphoBlueHelper is MainnetMorphoBlueAddresses {
    IMorphoBlue public constant morphoBlue = IMorphoBlue(MORPHO_BLUE_ADDRESS);
    
    uint256 internal constant MARKET_PARAMS_BYTES_LENGTH = 5 * 32;

    uint256 internal constant VIRTUAL_SHARES = 1e6;
    uint256 internal constant VIRTUAL_ASSETS = 1;

    /// @dev this changes state and uses up more gas
    /// @dev if you call other morpho blue state changing function in same transaction then its _accrueInterest will return early and save gas
    /// Function fetches debt in assets so that we know exactly how many tokens we need to repay the whole debt
    function getCurrentDebt(MarketParams memory marketParams, address owner) internal returns (uint256 currentDebtInAssets, uint256 borrowShares){
        morphoBlue.accrueInterest(marketParams);
        Id marketId = MarketParamsLib.id(marketParams);
        borrowShares = MorphoLib.borrowShares(morphoBlue, marketId, owner);
        currentDebtInAssets = SharesMathLib.toAssetsUp(
            borrowShares, 
            MorphoLib.totalBorrowAssets(morphoBlue, marketId),
            MorphoLib.totalBorrowShares(morphoBlue, marketId)
        );
    }
    /// Function reads supply shares for a given user from MorphoBlue state
    function getSupplyShares(MarketParams memory marketParams, address owner) internal view returns (uint256 supplyShares){
        Id marketId = MarketParamsLib.id(marketParams);
        supplyShares = MorphoLib.supplyShares(morphoBlue, marketId, owner);
    }

    function getRatioUsingParams(MarketParams memory marketParams, address owner) public returns (uint256 ratio){
        Id marketId = MarketParamsLib.id(marketParams);
        ratio = getRatio(marketId, marketParams, owner);
    }

    function getRatioUsingId(Id marketId, address owner) public returns (uint256 ratio){
        MarketParams memory marketParams = morphoBlue.idToMarketParams(marketId);
        ratio = getRatio(marketId, marketParams, owner);
    }

    function getRatio(Id marketId, MarketParams memory marketParams, address owner) public returns (uint256 ratio){
        uint256 oraclePrice = IOracle(marketParams.oracle).price();
        morphoBlue.accrueInterest(marketParams);

        Market memory market = morphoBlue.market(marketId);
        MorphoBluePosition memory position = morphoBlue.position(marketId, owner);
        
        uint256 collateral = position.collateral;
        if (collateral == 0) return 0;
        uint256 debt = SharesMathLib.toAssetsUp(position.borrowShares, market.totalBorrowAssets, market.totalBorrowShares);
        if (debt == 0) return 0;
        ratio = collateral * oraclePrice / debt / 1e18;
    }
}