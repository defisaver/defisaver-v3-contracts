// SPDX-License-Identifier: MIT

pragma solidity =0.8.4;

import "../auth/AdminAuth.sol";
import "../actions/mcd/helpers/McdRatioHelper.sol";
import "../interfaces/ITrigger.sol";

contract McdRatioTrigger is ITrigger, AdminAuth, McdRatioHelper {

    enum RatioState { OVER, UNDER }
    
    struct CallParams {
        uint256 nextPrice;
    }
    struct SubParams {
        uint256 vaultId;
        uint256 ratio;
        uint8 state;
    }

    function isTriggered(bytes memory _callData, bytes memory _subData)
        public
        view
        override
        returns (bool)
    {   
        CallParams memory triggerCallData = parseCallInputs(_callData);
        SubParams memory triggerSubData = parseSubInputs(_subData);

        uint256 currRatio = getRatio(triggerSubData.vaultId, triggerCallData.nextPrice); // GAS 50k

        // TODO: validation for nextPrice?

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

    function parseCallInputs(bytes memory _callData) internal pure returns (CallParams memory params) {
        params = abi.decode(_callData, (CallParams));
    }

    function parseSubInputs(bytes memory _subData) internal pure returns (SubParams memory params) {
        params = abi.decode(_subData, (SubParams));
    }

}
