// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { AdminAuth } from "../auth/AdminAuth.sol";
import { ITrigger } from "../interfaces/ITrigger.sol";
import { LiquityHelper } from "../actions/liquity/helpers/LiquityHelper.sol";
import { LiquityRatioHelper } from "../actions/liquity/helpers/LiquityRatioHelper.sol";
import { TriggerHelper } from "./helpers/TriggerHelper.sol";
import { TransientStorage } from "../utils/TransientStorage.sol";


/// @title Checks if total amount of debt in front of a specified trove is over a limit
contract LiquityDebtInFrontWithLimitTrigger is ITrigger, AdminAuth, LiquityRatioHelper, TriggerHelper, LiquityHelper {

    /// @notice Max number of troves to check is 250.
    uint256 internal constant MAX_ITERATIONS = 250;

    TransientStorage public constant tempStorage = TransientStorage(TRANSIENT_STORAGE);

    /// @param troveOwner Trove is based on user address so we use trove owner addr
    /// @param debtInFrontMin Minimal amount of debtInFront that is required
    struct SubParams {
        address troveOwner;
        uint256 debtInFrontMin;
    }

    function isTriggered(bytes memory, bytes memory _subData) public override returns (bool) {
        SubParams memory triggerSubData = parseSubInputs(_subData);

        uint256 debtInFront;
        address next = triggerSubData.troveOwner;

        (uint256 currRatio, bool isActive) = getRatio(triggerSubData.troveOwner);
        
        if (isActive == false || currRatio == 0) return false;

        /// @dev Needed for LiquityRatioIncreaseCheck later
        tempStorage.setBytes32("LIQUITY_RATIO", bytes32(currRatio));

        uint256 i;

        for (; i < MAX_ITERATIONS; ++i) {
            next = SortedTroves.getNext(next);

            // if we're at the end of the list
            if (next == address(0)) {
                // if current debtInFront is less than minimum return true
                if (debtInFront <= triggerSubData.debtInFrontMin) {
                    return true;
                }

                return false;
            }

            debtInFront += TroveManager.getTroveDebt(next);

            // jump out of the loop early to save on gas
            if (debtInFront > triggerSubData.debtInFrontMin) {
                return false;
            }

        }

        return false;
    }
    
    function changedSubData(bytes memory _subData) public pure override returns (bytes memory) {
    }
    
    function isChangeable() public pure override returns (bool){
        return false;
    }

    function parseSubInputs(bytes memory _subData) public pure returns (SubParams memory params) {
        params = abi.decode(_subData, (SubParams));
    }
}
