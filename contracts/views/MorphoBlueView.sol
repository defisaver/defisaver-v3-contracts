// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { MorphoBlueHelper } from "../actions/morpho-blue/helpers/MorphoBlueHelper.sol";
import { IIrm } from "../interfaces/morpho-blue/IIrm.sol";
import { IOracle } from "../interfaces/morpho-blue/IOracle.sol";
import { Id, MarketParams, Market, MorphoBluePosition } from "../interfaces/morpho-blue/IMorphoBlue.sol";
import { MarketParamsLib, MorphoLib, SharesMathLib } from "../actions/morpho-blue/helpers/MorphoBlueLib.sol";

contract MorphoBlueView is MorphoBlueHelper {

    using SharesMathLib for uint256;

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

    struct LiquidityChangeParams {
        MarketParams marketParams;
        bool isBorrowOperation;
        uint256 liquidityAdded;
        uint256 liquidityRemoved;
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

    function getApyAfterValuesEstimation(LiquidityChangeParams memory params) public returns (uint256 borrowRate, Market memory market) {
        Id marketId = MarketParamsLib.id(params.marketParams);
        morphoBlue.accrueInterest(params.marketParams);
        market = morphoBlue.market(marketId);

        // if isBorrowOperation => (liquidityAdded = repay, liquidityRemoved = borrow)
        // if not, look at it as supply/withdraw operation => (liquidityAdded = supply, liquidityRemoved = withdraw)
        // collateral is not part of interest rate strategy calculations
        if (params.isBorrowOperation) {
            // when repaying
            if (params.liquidityAdded > 0) {
                uint256 shares = params.liquidityAdded.toSharesDown(market.totalBorrowAssets, market.totalBorrowShares);
                market.totalBorrowShares = shares > market.totalBorrowShares ? 0 
                    : market.totalBorrowShares - uint128(shares);
                market.totalBorrowAssets = params.liquidityAdded > market.totalBorrowAssets ? 0
                    : market.totalBorrowAssets - uint128(params.liquidityAdded);
            }
            // when borrowing
            if (params.liquidityRemoved > 0) {
                uint256 shares = params.liquidityRemoved.toSharesUp(market.totalBorrowAssets, market.totalBorrowShares);
                market.totalBorrowShares += uint128(shares);
                market.totalBorrowAssets += uint128(params.liquidityRemoved);
            }
        } else {
            // when supplying
            if (params.liquidityAdded > 0) {
                uint256 shares = params.liquidityAdded.toSharesDown(market.totalSupplyAssets, market.totalSupplyShares);
                market.totalSupplyShares += uint128(shares);
                market.totalSupplyAssets += uint128(params.liquidityAdded);    
            }
            // when withdrawing
            if (params.liquidityRemoved > 0) {
                uint256 shares = params.liquidityRemoved.toSharesUp(market.totalSupplyAssets, market.totalSupplyShares);
                market.totalSupplyShares = shares > market.totalSupplyShares ? 0 
                    : market.totalSupplyShares - uint128(shares);
                market.totalSupplyAssets = params.liquidityRemoved > market.totalSupplyAssets ? 0
                    : market.totalSupplyAssets - uint128(params.liquidityRemoved);
            }
        }
        borrowRate = IIrm(params.marketParams.irm).borrowRateView(params.marketParams, market);
    }

}