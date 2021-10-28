// SPDX-License-Identifier: MIT

pragma solidity =0.8.4;

import "../../../DS/DSMath.sol";
import "../../../interfaces/liquity/ITroveManager.sol";
import "../../../interfaces/liquity/IPriceFeed.sol";

/// @title Helper methods for Liquity ratio calc.
contract LiquityRatioHelper is DSMath {

    ITroveManager constant public TroveManager = ITroveManager(0xA39739EF8b0231DbFA0DcdA07d7e29faAbCf4bb2);
    IPriceFeed constant public PriceFeed = IPriceFeed(0x4c517D4e2C851CA76d7eC94B805269Df0f2201De);

    /// @notice Gets Trove CR
    /// @param _troveOwner Address of the trove owner
    function getRatio(address _troveOwner) public view returns (uint256 ratio, bool isActive) {
        uint256 troveStatus = TroveManager.getTroveStatus(_troveOwner);
        isActive = troveStatus == 1;
        if (isActive == false) return (ratio, isActive);

        uint256 debtAmount = TroveManager.getTroveDebt(_troveOwner);
        if (debtAmount == 0) return (ratio, isActive);

        uint256 collAmount = TroveManager.getTroveColl(_troveOwner);
        uint256 collPrice = PriceFeed.lastGoodPrice();

        ratio = wdiv(wmul(collAmount, collPrice), debtAmount);
    }
}