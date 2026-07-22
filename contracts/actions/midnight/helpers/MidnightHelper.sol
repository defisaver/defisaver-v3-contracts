// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { Market, CollateralParams } from "../../../interfaces/protocols/midnight/IMidnight.sol";
import { IOracle } from "../../../interfaces/protocols/midnight/IOracle.sol";
import { IdLib } from "../../../_vendor/midnight/IdLib.sol";
import { UtilsLib } from "../../../_vendor/midnight/UtilsLib.sol";
import { BaseMidnightAddresses } from "./BaseMidnightAddresses.sol";

contract MidnightHelper is BaseMidnightAddresses {
    error InvalidCollateralIndex();

    /// @dev Oracle price is scaled by 1e36 + debtDec - collDec
    /// If we want to calculate collateral value in deb tokens:
    /// X = collateral * price * 10^debtDec / 10^collDec / 10^(36 + debtDec - collDec)
    /// X = collateral * price * 10^debtDec / 10^(collDec + 36 + debtDec - collDec)
    /// X = collateral * price * 10^debtDec / 10^(36 + debtDec)
    /// X = collateral * price / 10^36
    /// X = collateral * price / ORACLE_PRICE_SCALE
    uint256 internal constant ORACLE_PRICE_SCALE = 1e36;
    uint256 internal constant WAD = 1e18;

    function getRatio(bytes32 _id, address _user) public view returns (uint256 ratio) {
        (,,,, uint128 debt, uint128 collateralBitmap) = MIDNIGHT.position(_id, _user);

        if (debt == 0) return 0;

        Market memory market = MIDNIGHT.toMarket(_id);

        uint256 totalCollInDebtToken;
        while (collateralBitmap != 0) {
            uint256 i = UtilsLib.msb(collateralBitmap);
            uint256 price = IOracle(market.collateralParams[i].oracle).price();
            uint256 collateral = MIDNIGHT.collateral(_id, _user, i);
            totalCollInDebtToken += collateral * price / ORACLE_PRICE_SCALE;
            collateralBitmap = UtilsLib.clearBit(collateralBitmap, i);
        }

        ratio = totalCollInDebtToken * WAD / debt;
    }
}
