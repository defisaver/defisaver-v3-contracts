// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { IMidnight, Offer } from "../../interfaces/protocols/midnight/IMidnight.sol";
import { UtilsLib } from "./UtilsLib.sol";
import { TickLib } from "./TickLib.sol";

/// @dev Taken from: https://github.com/morpho-org/midnight
/// @dev Changes:
/// - interfaces and imports are adapted
/// - WAD is defined in the library for simplicity
/// - `require(Error())` syntax changed to `revert Error()` to work with 0.8.24
library TakeAmountsLib {
    uint256 internal constant WAD = 1e18;

    using UtilsLib for uint256;

    /// @dev Forward: buyerAssets = offer.buy ? units.mulDivDown(buyerPrice, WAD) : units.mulDivUp(buyerPrice, WAD).
    /// @dev Assumes that id and offer.market match.
    /// @dev Reverts if buyerPrice > WAD, because not all buyerAssets are reachable then.
    /// @dev Reverts if offerPrice < settlementFee in case of a buy offer (midnight reverts too).
    /// @dev Returns units (not necessarily the smallest/biggest) for which take yields exactly targetBuyerAssets.
    function buyerAssetsToUnits(
        address midnight,
        bytes32 id,
        Offer memory offer,
        uint256 targetBuyerAssets
    ) internal view returns (uint256) {
        uint256 offerPrice = TickLib.tickToPrice(offer.tick);
        uint256 settlementFee = IMidnight(midnight)
            .settlementFee(id, UtilsLib.zeroFloorSub(offer.market.maturity, block.timestamp));
        // Mirrors Midnight's computation to revert if offerPrice < settlementFee in case of a buy offer.
        uint256 sellerPrice = offer.buy ? offerPrice - settlementFee : offerPrice;
        uint256 buyerPrice = sellerPrice + settlementFee;
        if (buyerPrice > WAD) revert TickLib.PriceGreaterThanOne();
        return offer.buy
            ? targetBuyerAssets.mulDivUp(WAD, buyerPrice)
            : targetBuyerAssets.mulDivDown(WAD, buyerPrice);
    }

    /// @dev Forward: sellerAssets = offer.buy ? units.mulDivDown(sellerPrice, WAD) : units.mulDivUp(sellerPrice, WAD).
    /// @dev Assumes that id and offer.market match.
    /// @dev Reverts if offerPrice < settlementFee in case of a buy offer (midnight reverts too).
    /// @dev Returns units (not necessarily the smallest/biggest) for which take yields exactly targetSellerAssets.
    function sellerAssetsToUnits(
        address midnight,
        bytes32 id,
        Offer memory offer,
        uint256 targetSellerAssets
    ) internal view returns (uint256) {
        uint256 offerPrice = TickLib.tickToPrice(offer.tick);
        uint256 settlementFee = IMidnight(midnight)
            .settlementFee(id, UtilsLib.zeroFloorSub(offer.market.maturity, block.timestamp));
        uint256 sellerPrice = offer.buy ? offerPrice - settlementFee : offerPrice;
        return offer.buy
            ? targetSellerAssets.mulDivUp(WAD, sellerPrice)
            : targetSellerAssets.mulDivDown(WAD, sellerPrice);
    }
}
