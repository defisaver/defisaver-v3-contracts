// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../auth/AdminAuth.sol";
import "../actions/reflexer/helpers/ReflexerRatioHelper.sol";
import "../interfaces/ITrigger.sol";

/// @title Trigger contract that verifies if the Reflexer position went over/under the subbed ratio
contract ReflexerRatioTrigger is ITrigger, AdminAuth, ReflexerRatioHelper {

    enum RatioState { OVER, UNDER }

    /// @param safeId Reflexer vault Id that we want to check
    /// @param ratio ratio that represents the triggerable point
    /// @param state represents if we want the current state to be higher or lower than ratio param
    struct SubParams {
        uint256 safeId;
        uint256 ratio;
        uint8 state;
    }
    /// @dev checks current safety ratio of a Liquity position and triggers if it's in a correct state
    function isTriggered(bytes memory, bytes memory _subData)
        public
        override
        returns (bool)
    {
        SubParams memory triggerSubData = parseSubInputs(_subData);

        uint256 currRatio = getRatio(triggerSubData.safeId);

        if (RatioState(triggerSubData.state) == RatioState.OVER) {
            if (currRatio > triggerSubData.ratio) return true;
        }

        if (RatioState(triggerSubData.state) == RatioState.UNDER) {
            if (currRatio < triggerSubData.ratio) return true;
        }

        return false;
    }
   
    function changedSubData(bytes memory _subData) public pure override  returns (bytes memory) {
    }
    
    function isChangeable() public pure override returns (bool){
        return false;
    }

    function parseSubInputs(bytes memory _subData) internal pure returns (SubParams memory params) {
        params = abi.decode(_subData, (SubParams));
    }

}
