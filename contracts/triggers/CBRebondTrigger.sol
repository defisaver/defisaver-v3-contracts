// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../auth/AdminAuth.sol";
import "../interfaces/ITrigger.sol";
import "../actions/liquity/helpers/CBHelper.sol";

/// @title Chicken Bonds trigger when the optimal amount of bLUSD has accrued
contract CBRebondTrigger is ITrigger, AdminAuth, CBHelper {
    using Sqrt for uint256;

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

        (uint256 optimalRebondAmount, uint256 marketPrice) = getOptimalBLusdAmount(bondData.lusdAmount);

        // Sanity check if the calculation returns 0 or we get bLUSD amount less than initial LUSD deposited
        if (optimalRebondAmount == 0 || wmul(optimalRebondAmount, marketPrice) < bondData.lusdAmount) {
            return false;
        }

        if (currentBLusdAmount >= optimalRebondAmount) {
            return true;
        }

        return false;
    }

    function parseInputs(bytes memory _subData) internal pure returns (SubParams memory params) {
        params = abi.decode(_subData, (SubParams));
    }

    function changedSubData(bytes memory _subData) public view override returns (bytes memory) {
        SubParams memory triggerSubData = parseInputs(_subData);

        // update bondId to the next one which will be created once the trigger is activated
        triggerSubData.bondID = IBondNFT(BOND_NFT_ADDRESS).totalSupply() + 1;
        return abi.encode(triggerSubData);
    }

    function isChangeable() public pure override returns (bool) {
        return true;
    }
}
