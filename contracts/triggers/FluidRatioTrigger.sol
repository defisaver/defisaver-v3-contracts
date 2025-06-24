// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { AdminAuth } from "../auth/AdminAuth.sol";
import { ITrigger } from "../interfaces/ITrigger.sol";
import { TriggerHelper } from "./helpers/TriggerHelper.sol";
import { FluidRatioHelper } from "../actions/fluid/helpers/FluidRatioHelper.sol";
import { TransientStorage } from "../utils/TransientStorage.sol";

/// @title Trigger contract that verifies if current fluid position ratio went over/under the subbed ratio
contract FluidRatioTrigger is 
    ITrigger,
    AdminAuth,
    FluidRatioHelper,
    TriggerHelper
{
    TransientStorage public constant tempStorage = TransientStorage(TRANSIENT_STORAGE);

    enum RatioState { OVER, UNDER }

    /// @param nftId nft id of the fluid position
    /// @param ratio ratio that represents the triggerable point
    /// @param state represents if we want the current state to be higher or lower than ratio param
    struct SubParams {
        uint256 nftId;
        uint256 ratio;
        uint8 state;
    }
    
    /// @dev checks current ratio of a fluid position and triggers if it's in a correct state
    function isTriggered(bytes memory, bytes memory _subData)
        public
        override
        returns (bool)
    {   
        SubParams memory triggerSubData = parseSubInputs(_subData);

        uint256 currRatio = getRatio(triggerSubData.nftId);
        
        if (currRatio == 0) return false;

        tempStorage.setBytes32("FLUID_RATIO", bytes32(currRatio));
        
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
    
    function isChangeable() public pure override returns (bool) {
        return false;
    }
}