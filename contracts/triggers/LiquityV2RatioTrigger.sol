// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { AdminAuth } from "../auth/AdminAuth.sol";
import { ITrigger } from "../interfaces/ITrigger.sol";
import { TriggerHelper } from "./helpers/TriggerHelper.sol";
import { LiquityV2RatioHelper } from "../actions/liquityV2/helpers/LiquityV2RatioHelper.sol";
import { TransientStorage } from "../utils/TransientStorage.sol";

/// @title Trigger contract that verifies if current LiquityV2 position ratio went over/under the subbed ratio
contract LiquityV2RatioTrigger is 
    ITrigger,
    AdminAuth,
    LiquityV2RatioHelper,
    TriggerHelper
{
    TransientStorage public constant tempStorage = TransientStorage(TRANSIENT_STORAGE);

    enum RatioState { OVER, UNDER }

    /// @param market address of the market where the trove is
    /// @param troveId id of the trove
    /// @param ratio ratio that represents the triggerable point
    /// @param state represents if we want the current state to be higher or lower than ratio param
    struct SubParams {
        address market;
        uint256 troveId;
        uint256 ratio;
        uint8 state;
    }
    /// @dev checks current ratio of a LiquityV2 trove and triggers if it's in a correct state
    function isTriggered(bytes memory, bytes memory _subData)
        public
        override
        returns (bool)
    {   
        SubParams memory triggerSubData = parseSubInputs(_subData);

        (uint256 currRatio, bool isActive) = getRatio(triggerSubData.market, triggerSubData.troveId);
        
        if (isActive == false || currRatio == 0) return false;

        tempStorage.setBytes32("LIQUITY_V2_RATIO", bytes32(currRatio));
        
        if (RatioState(triggerSubData.state) == RatioState.OVER) {
            if (currRatio > triggerSubData.ratio) return true;
        }

        if (RatioState(triggerSubData.state) == RatioState.UNDER) {
            if (currRatio < triggerSubData.ratio) return true;
        }

        return false;
    }

    function parseSubInputs(bytes memory _subData) public pure returns (SubParams memory params) {
        params = abi.decode(_subData, (SubParams));
    }

    function changedSubData(bytes memory _subData) public pure override  returns (bytes memory) {}
    
    function isChangeable() public pure override returns (bool){
        return false;
    }
}
