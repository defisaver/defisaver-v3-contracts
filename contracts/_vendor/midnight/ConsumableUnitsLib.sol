// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { IMidnight, Offer } from "../../interfaces/protocols/midnight/IMidnight.sol";
import { UtilsLib } from "./UtilsLib.sol";
import { TakeAmountsLib } from "./TakeAmountsLib.sol";

/// @dev Taken from: https://github.com/morpho-org/midnight
/// @dev Changes:
/// - interfaces and imports are adapted
library ConsumableUnitsLib {
    using UtilsLib for uint128;

    /// @dev Returns a number of units such that it fully consumes the offer.
    /// @dev Assumes that `id` matches `offer.market`.
    function consumableUnits(address midnight, bytes32 id, Offer memory offer)
        internal
        view
        returns (uint256)
    {
        uint256 consumed = IMidnight(midnight).consumed(offer.maker, offer.group);
        if (offer.maxUnits > 0) {
            return offer.maxUnits.zeroFloorSub(consumed);
        } else if (offer.buy) {
            return TakeAmountsLib.buyerAssetsToUnits(
                midnight, id, offer, offer.maxAssets.zeroFloorSub(consumed)
            );
        } else {
            return TakeAmountsLib.sellerAssetsToUnits(
                midnight, id, offer, offer.maxAssets.zeroFloorSub(consumed)
            );
        }
    }
}
