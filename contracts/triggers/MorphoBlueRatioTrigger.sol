// SPDX-License-Identifier: MIT

pragma solidity =0.8.27;

import { AdminAuth } from "../auth/AdminAuth.sol";
import { TransientStorage } from "../utils/TransientStorage.sol";
import { MorphoBlueHelper } from "../actions/morpho-blue/helpers/MorphoBlueHelper.sol";
import { ITrigger } from "../interfaces/ITrigger.sol";
import { TriggerHelper } from "./helpers/TriggerHelper.sol";
import { Id } from "../interfaces/morpho-blue/IMorphoBlue.sol";

/// @title Trigger contract that verifies if the MorphoBlue position went over/under the subbed ratio
contract MorphoBlueRatioTrigger is ITrigger, AdminAuth, MorphoBlueHelper, TriggerHelper {

    enum RatioState { OVER, UNDER }

    TransientStorage public constant tempStorage = TransientStorage(TRANSIENT_STORAGE);
    
    /// @param marketId bytes32 representing a MorphoBlue market
    /// @param user address of the user whose position we check
    /// @param ratio ratio that represents the triggerable point
    /// @param state represents if we want the current state to be higher or lower than ratio param
    struct SubParams {
        Id marketId; // this is bytes32
        address user;
        uint256 ratio;
        uint8 state;
    }
    
    /// @dev checks current safety ratio of a MorphoBlue position and triggers if it's in a correct state
    function isTriggered(bytes memory, bytes memory _subData)
        public
        override
        returns (bool)
    {   
        SubParams memory triggerSubData = parseSubInputs(_subData);
        uint256 currRatio = getRatioUsingId(triggerSubData.marketId, triggerSubData.user);

        if (currRatio == 0) return false;

        tempStorage.setBytes32("MORPHOBLUE_RATIO", bytes32(currRatio));

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
