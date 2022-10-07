// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../auth/AdminAuth.sol";
import "../interfaces/ITrigger.sol";
import "../interfaces/IERC20.sol";
import "../actions/liquity/helpers/LiquityHelper.sol";

/// @title Checks if total amount of debt in front of a specified trove is over a limit
contract LiquityDebtInFrontTrigger is ITrigger, AdminAuth, LiquityHelper {

    /// @param troveOwner Trove is based on user address so we use trove owner addr
    /// @param debtInFrontMin Minimal amount of debtInFront that is required
    struct SubParams {
        address troveOwner;
        uint256 debtInFrontMin;
    }

    function isTriggered(bytes memory, bytes memory _subData) public view override returns (bool) {
        SubParams memory triggerSubData = parseInputs(_subData);

        uint256 debtInFront;
        address next = triggerSubData.troveOwner;

        // worst case goes through the whole list (can be gas intensive)
        while(next != address(0)) {
            next = SortedTroves.getNext(next);
            debtInFront += TroveManager.getTroveDebt(next);

            // jump out of the loop early to save on gas
            if (debtInFront > triggerSubData.debtInFrontMin) {
                return false;
            }
        }

        if (debtInFront < triggerSubData.debtInFrontMin) {
            return true;
        }

        return false;
    }
    
    function changedSubData(bytes memory _subData) public pure override returns (bytes memory) {
    }
    
    function isChangeable() public pure override returns (bool){
        return false;
    }

    function parseInputs(bytes memory _subData) public pure returns (SubParams memory params) {
        params = abi.decode(_subData, (SubParams));
    }
}
