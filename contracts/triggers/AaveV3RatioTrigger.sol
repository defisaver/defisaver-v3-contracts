// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { AdminAuth } from "../auth/AdminAuth.sol";
import { AaveV3RatioHelper } from "../actions/aaveV3/helpers/AaveV3RatioHelper.sol";
import { ITrigger } from "../interfaces/ITrigger.sol";
import { TransientStorage } from "../utils/TransientStorage.sol";
import { TriggerHelper } from "./helpers/TriggerHelper.sol";

/// @title Trigger that triggers when the ratio of a user's position in aaveV3 market is over or under a certain ratio
contract AaveV3RatioTrigger is ITrigger, AdminAuth, AaveV3RatioHelper, TriggerHelper {

    TransientStorage public constant tempStorage = TransientStorage(TRANSIENT_STORAGE);

    enum RatioState { OVER, UNDER }
    
    /// @param user address of the user whose position we check
    /// @param market aaveV3 market address
    /// @param ratio ratio that represents the triggerable point
    /// @param state represents if we want the current state to be higher or lower than ratio param
    struct SubParams {
        address user;
        address market;
        uint256 ratio;
        uint8 state;
    }
    
    function isTriggered(bytes memory, bytes memory _subData)
        public
        override
        returns (bool)
    {   
        SubParams memory triggerSubData = parseSubInputs(_subData);

        uint256 currRatio = getSafetyRatio(triggerSubData.market, triggerSubData.user);

        if (currRatio == 0) return false;

        tempStorage.setBytes32("AAVE_RATIO", bytes32(currRatio));

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
