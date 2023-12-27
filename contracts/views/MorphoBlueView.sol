// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "../actions/morpho-blue/helpers/MorphoBlueHelper.sol";
import "../interfaces/morpho-blue/IIrm.sol";
import "../interfaces/morpho-blue/IOracle.sol";

contract MorphoBlueView is MorphoBlueHelper {

    struct MarketInfo {
        Id id;
        uint128 totalSupplyAssets;
        uint128 totalSupplyShares;
        uint128 totalBorrowAssets;
        uint128 totalBorrowShares;
        uint256 lastUpdate;
        uint256 fee;
        uint256 borrowRate;
        uint256 oracle;
    }

    struct PositionInfo {
        uint256 supplyShares;
        uint256 suppliedInAssets;
        uint256 borrowShares;
        uint256 borrowedInAssets;
        uint256 collateral;
    }

    function getMarketInfo(MarketParams memory marketParams) public returns (MarketInfo memory) {    
        Id marketId = MarketParamsLib.id(marketParams);
        uint128 lastUpdate = MorphoLib.lastUpdate(morphoBlue, marketId);
        uint128 fee = MorphoLib.fee(morphoBlue, marketId);
        morphoBlue.accrueInterest(marketParams);
        Market memory market = morphoBlue.market(marketId);
        return MarketInfo({
            id: marketId,
            totalSupplyAssets: market.totalSupplyAssets,
            totalSupplyShares: market.totalSupplyShares,
            totalBorrowAssets: market.totalBorrowAssets,
            totalBorrowShares: market.totalBorrowShares,
            lastUpdate: lastUpdate,
            fee: fee,
            borrowRate: IIrm(marketParams.irm).borrowRateView(marketParams, market),
            oracle: IOracle(marketParams.oracle).price()
        });
    }

    function getMarketInfoNotTuple(address loanToken, address collToken, address oracle, address irm, uint256 lltv) public returns (MarketInfo memory) {    
        MarketParams memory marketParams = MarketParams({
            loanToken: loanToken,
            collateralToken: collToken,
            oracle: oracle,
            irm: irm,
            lltv: lltv
        });
        Id marketId = MarketParamsLib.id(marketParams);
        uint128 lastUpdate = MorphoLib.lastUpdate(morphoBlue, marketId);
        uint128 fee = MorphoLib.fee(morphoBlue, marketId);
        morphoBlue.accrueInterest(marketParams);
        Market memory market = morphoBlue.market(marketId);
        return MarketInfo({
            id: marketId,
            totalSupplyAssets: market.totalSupplyAssets,
            totalSupplyShares: market.totalSupplyShares,
            totalBorrowAssets: market.totalBorrowAssets,
            totalBorrowShares: market.totalBorrowShares,
            lastUpdate: lastUpdate,
            fee: fee,
            borrowRate: IIrm(marketParams.irm).borrowRateView(marketParams, market),
            oracle: IOracle(marketParams.oracle).price()
        });
    }

    function getMarketId(MarketParams memory marketParams) public pure returns (Id id){
        id = MarketParamsLib.id(marketParams);
    }

    function getUserInfo(MarketParams memory marketParams, address owner) public returns (PositionInfo memory) {
        Id marketId = MarketParamsLib.id(marketParams);
        morphoBlue.accrueInterest(marketParams);
        MorphoBluePosition memory position = morphoBlue.position(marketId, owner);
        Market memory market = morphoBlue.market(marketId);
        return PositionInfo({
            supplyShares: position.supplyShares,
            suppliedInAssets: SharesMathLib.toAssetsDown(position.supplyShares, market.totalSupplyAssets, market.totalSupplyShares),
            borrowShares: position.borrowShares,
            borrowedInAssets: SharesMathLib.toAssetsUp(position.borrowShares, market.totalBorrowAssets, market.totalBorrowShares),
            collateral: position.collateral
        });
    }
}