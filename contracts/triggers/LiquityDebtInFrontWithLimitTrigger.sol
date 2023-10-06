// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../auth/AdminAuth.sol";
import "../interfaces/ITrigger.sol";
import "../actions/liquity/helpers/LiquityHelper.sol";
import "../actions/liquity/helpers/LiquityRatioHelper.sol";
import "./helpers/TriggerHelper.sol";
import "../utils/TransientStorage.sol";


/// @title Checks if total amount of debt in front of a specified trove is over a limit
contract LiquityDebtInFrontWithLimitTrigger is ITrigger, AdminAuth, LiquityRatioHelper, TriggerHelper, LiquityHelper {

    uint256 constant internal MAX_ITERATIONS = 200;

    TransientStorage public constant tempStorage = TransientStorage(TRANSIENT_STORAGE);

    /// @param troveOwner Trove is based on user address so we use trove owner addr
    /// @param debtInFrontMin Minimal amount of debtInFront that is required
    struct SubParams {
        address troveOwner;
        uint256 debtInFrontMin;
    }

    function isTriggered(bytes memory, bytes memory _subData) public override returns (bool) {
        SubParams memory triggerSubData = parseInputs(_subData);

        uint256 debtInFront;
        address next = triggerSubData.troveOwner;

        (uint256 currRatio, bool isActive) = getRatio(triggerSubData.troveOwner);
        
        if (isActive == false || currRatio == 0) return false;

        tempStorage.setBytes32("LIQUITY_RATIO", bytes32(currRatio));

        uint256 i;

        while(next != address(0)) {
            next = SortedTroves.getNext(next);
            debtInFront += TroveManager.getTroveDebt(next);

            // jump out of the loop early to save on gas
            if (debtInFront > triggerSubData.debtInFrontMin) {
                return false;
            }

            i++;

            // don't allow repay if to many troves in front
            if (i >=  MAX_ITERATIONS) {
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
