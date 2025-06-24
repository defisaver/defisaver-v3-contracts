// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ITrigger } from "../interfaces/ITrigger.sol";
import { MorphoAaveV2Helper } from "../actions/morpho/aaveV2/helpers/MorphoAaveV2Helper.sol";
import { TransientStorage } from "../utils/TransientStorage.sol";
import { TriggerHelper } from "./helpers/TriggerHelper.sol";

/// @title Trigger that triggers when the ratio of a user's position in a Morpho AaveV2 market is over or under a certain ratio.
contract MorphoAaveV2RatioTrigger is ITrigger, MorphoAaveV2Helper, TriggerHelper {

    enum RatioState { OVER, UNDER }
    
    /// @param user address of the user whose position we check
    /// @param ratio ratio that represents the triggerable point
    /// @param state represents if we want the current state to be higher or lower than ratio param
    struct SubParams {
        address user;
        uint256 ratio;
        uint8 state;
    }
    
    function isTriggered(bytes memory, bytes memory _subData)
        public
        override
        returns (bool)
    {
        SubParams memory triggerSubData = parseSubInputs(_subData);
        uint256 currRatio = getSafetyRatio(triggerSubData.user);
        
        if (currRatio == 0) return false;

        TransientStorage(TRANSIENT_STORAGE).setBytes32("MORPHO_AAVEV2_RATIO", bytes32(currRatio));
        
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

    function changedSubData(bytes memory _subData) public pure override  returns (bytes memory) {
    }
    
    function isChangeable() public pure override returns (bool){
        return false;
    }
}
