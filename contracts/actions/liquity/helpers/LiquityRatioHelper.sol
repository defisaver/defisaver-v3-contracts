// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../../../DS/DSMath.sol";
import "../../../interfaces/liquity/ITroveManager.sol";
import "../../../interfaces/liquity/IPriceFeed.sol";
import "./MainnetLiquityAddresses.sol";

/// @title Helper methods for Liquity ratio calc.
contract LiquityRatioHelper is DSMath, MainnetLiquityAddresses {

    /// @notice Gets Trove CR
    /// @param _troveOwner Address of the trove owner
    function getRatio(address _troveOwner) public returns (uint256 ratio, bool isActive) {
        ITroveManager TroveManager = ITroveManager(TROVE_MANAGER_ADDRESS);
        IPriceFeed PriceFeed = IPriceFeed(PRICE_FEED_ADDRESS);

        isActive = TroveManager.getTroveStatus(_troveOwner) == 1;

        if (!isActive) return (ratio, isActive);

        uint256 debtAmount = TroveManager.getTroveDebt(_troveOwner);
        if (debtAmount == 0) return (ratio, isActive);

        uint256 collAmount = TroveManager.getTroveColl(_troveOwner);
        uint256 collPrice = PriceFeed.fetchPrice();

        ratio = wdiv(wmul(collAmount, collPrice), debtAmount);
    }
}