// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { Market, MarketState } from "../interfaces/protocols/midnight/IMidnight.sol";
import { IOracle } from "../interfaces/protocols/midnight/IOracle.sol";
import { IdLib } from "../_vendor/midnight/IdLib.sol";
import { UtilsLib } from "../_vendor/midnight/UtilsLib.sol";
import { MidnightHelper } from "../actions/midnight/helpers/MidnightHelper.sol";

contract MidnightView is MidnightHelper {
    struct MarketInfo {
        bytes32 id;
        uint128 totalUnits;
        uint128 lossFactor;
        uint128 withdrawable;
        uint128 continuousFeeCredit;
        uint16[7] settlementFees;
        uint32 continuousFee;
        uint8 tickSpacing;
        uint256[] prices;
    }

    struct PositionInfo {
        uint128 credit;
        uint128 pendingFee;
        uint128 debt;
        uint128 collateralBitmap;
        uint128[] collateral;
        uint256 ratio;
    }

    function toMarket(bytes32 _id) public view returns (Market memory market) {
        market = MIDNIGHT.toMarket(_id);
    }

    function toId(Market memory _market) public pure returns (bytes32 id) {
        id = IdLib.toId(_market);
    }

    function getMarketInfo(bytes32 _id) public view returns (MarketInfo memory info) {
        // Use separate calls to avoid stack too deep errors.
        info.id = _id;
        info.totalUnits = MIDNIGHT.totalUnits(_id);
        info.lossFactor = MIDNIGHT.lossFactor(_id);
        info.withdrawable = MIDNIGHT.withdrawable(_id);
        info.continuousFeeCredit = MIDNIGHT.continuousFeeCredit(_id);
        info.settlementFees = MIDNIGHT.settlementFeeCbps(_id);
        info.continuousFee = MIDNIGHT.continuousFee(_id);
        info.tickSpacing = MIDNIGHT.tickSpacing(_id);

        Market memory market = toMarket(_id);
        info.prices = new uint256[](market.collateralParams.length);
        for (uint256 i = 0; i < market.collateralParams.length; ++i) {
            info.prices[i] = IOracle(market.collateralParams[i].oracle).price();
        }
    }

    function getPositionInfo(bytes32 _id, address _user)
        public
        view
        returns (PositionInfo memory pos)
    {
        (pos.credit, pos.pendingFee,,, pos.debt, pos.collateralBitmap) =
            MIDNIGHT.position(_id, _user);

        Market memory market = toMarket(_id);

        pos.collateral = new uint128[](market.collateralParams.length);
        uint256 totalCollInDebtToken;

        uint128 map = pos.collateralBitmap;
        while (map != 0) {
            uint256 i = UtilsLib.msb(map);
            pos.collateral[i] = MIDNIGHT.collateral(_id, _user, i);
            if (pos.debt > 0 && pos.collateral[i] > 0) {
                uint256 price = IOracle(market.collateralParams[i].oracle).price();
                totalCollInDebtToken += pos.collateral[i] * price / ORACLE_PRICE_SCALE;
            }
            map = UtilsLib.clearBit(map, i);
        }

        pos.ratio = pos.debt > 0 ? (totalCollInDebtToken * WAD / pos.debt) : 0;

        if (pos.credit > 0) {
            (pos.credit, pos.pendingFee,) = MIDNIGHT.updatePositionView(market, _id, _user);
        }
    }
}
