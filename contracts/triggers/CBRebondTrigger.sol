// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../auth/AdminAuth.sol";
import "../interfaces/ITrigger.sol";
import "../actions/liquity/helpers/CBHelper.sol";

/// @title Chicken Bonds trigger when the optimal amount of bLUSD has accrued
contract CBRebondTrigger is ITrigger, AdminAuth, CBHelper {
    /// @param bondID Nft id of the chicken bond
    struct SubParams {
        uint256 bondID;
    }

    function isTriggered(bytes memory, bytes memory _subData) public view override returns (bool) {
        SubParams memory triggerSubData = parseInputs(_subData);
        IChickenBondManager.BondData memory bondData = CBManager.getBondData(triggerSubData.bondID);

        // bond must be in active state
        if (bondData.status != IChickenBondManager.BondStatus.active) {
            return false;
        }

        uint256 currentBLusdAmount = CBManager.calcAccruedBLUSD(triggerSubData.bondID);

        (uint256 optimalLusdRebondAmount, uint256 marketPrice) = getOptimalLusdAmount(bondData.lusdAmount);

        uint256 currentLusdAmount = wmul(currentBLusdAmount, marketPrice);

        // Sanity check if the calculation returns 0 or we get bLUSD amount less than initial LUSD deposited
        if (optimalLusdRebondAmount == 0 || optimalLusdRebondAmount < bondData.lusdAmount) {
            return false;
        }

        if (currentLusdAmount >= optimalLusdRebondAmount) {
            return true;
        }

        return false;
    }

    function parseInputs(bytes memory _subData) internal pure returns (SubParams memory params) {
        params = abi.decode(_subData, (SubParams));
    }

    function changedSubData(bytes memory _subData) public view override returns (bytes memory) {}

    function isChangeable() public pure override returns (bool) {
        return false;
    }
}
