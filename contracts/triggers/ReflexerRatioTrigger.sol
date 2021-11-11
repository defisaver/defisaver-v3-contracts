// SPDX-License-Identifier: MIT

pragma solidity =0.8.4;

import "../auth/AdminAuth.sol";
import "../actions/reflexer/helpers/ReflexerRatioHelper.sol";
import "../interfaces/ITrigger.sol";

contract ReflexerRatioTrigger is ITrigger, AdminAuth, ReflexerRatioHelper {

    enum RatioState { OVER, UNDER }

    struct SubParams {
        uint256 safeId;
        uint256 ratio;
        uint8 state;
    }

    function isTriggered(bytes memory _callData, bytes memory _subData)
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
