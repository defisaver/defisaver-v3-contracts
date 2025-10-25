// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { DSMath } from "../../../_vendor/DS/DSMath.sol";
import { IAddressesRegistry } from "../../../interfaces/protocols/liquityV2/IAddressesRegistry.sol";
import { ITroveManager } from "../../../interfaces/protocols/liquityV2/ITroveManager.sol";
import { IPriceFeed } from "../../../interfaces/protocols/liquityV2/IPriceFeed.sol";

/// @title Helper methods for LiquityV2 ratio calc.
contract LiquityV2RatioHelper is DSMath {
    /// @notice Gets Trove CR
    /// @param _market Address of the market where the trove is
    /// @param _troveId id of the trove
    function getRatio(address _market, uint256 _troveId) public returns (uint256 ratio, bool isActive) {
        IAddressesRegistry market = IAddressesRegistry(_market);
        ITroveManager troveManager = ITroveManager(market.troveManager());
        IPriceFeed priceFeed = IPriceFeed(market.priceFeed());

        isActive = troveManager.getTroveStatus(_troveId) == ITroveManager.Status.active;

        if (!isActive) return (ratio, isActive);

        ITroveManager.LatestTroveData memory troveData = troveManager.getLatestTroveData(_troveId);
        uint256 debtAmount = troveData.entireDebt;
        uint256 collAmount = troveData.entireColl;
        /// @dev If oracle is down, lastGoodPrice will be returned and used here
        (uint256 collPrice,) = priceFeed.fetchPrice();

        ratio = wdiv(wmul(collAmount, collPrice), debtAmount);
    }
}
