// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../auth/AdminAuth.sol";
import "../actions/liquity/helpers/LiquityRatioHelper.sol";
import "../interfaces/ITrigger.sol";

contract LiquityRatioTrigger is ITrigger, AdminAuth, LiquityRatioHelper {

    enum RatioState { OVER, UNDER }

    struct SubParams {
        address troveOwner;
        uint256 ratio;
        uint8 state;
    }

    function isTriggered(bytes memory _callData, bytes memory _subData)
        public
        view
        override
        returns (bool)
    {   
        SubParams memory triggerSubData = parseInputs(_subData);

        (uint256 currRatio, bool isActive) = getRatio(triggerSubData.troveOwner);
        
        if (isActive == false) return false;
        
        if (RatioState(triggerSubData.state) == RatioState.OVER) {
            if (currRatio > triggerSubData.ratio) return true;
        }

        if (RatioState(triggerSubData.state) == RatioState.UNDER) {
            if (currRatio < triggerSubData.ratio) return true;
        }

        return false;
    }

    function parseInputs(bytes memory _subData) internal pure returns (SubParams memory params) {
        params = abi.decode(_subData, (SubParams));
    }
    function changedSubData(bytes memory _subData) public pure override  returns (bytes memory) {
    }
    
    function isChangeable() public pure override returns (bool){
        return false;
    }

}
