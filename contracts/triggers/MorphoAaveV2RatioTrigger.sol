// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../interfaces/ITrigger.sol";
import "../interfaces/morpho/IMorphoAaveV2Lens.sol";
import "../actions/morpho/helpers/MorphoHelper.sol";
import "../utils/TransientStorage.sol";

contract MorphoAaveV2RatioTrigger is ITrigger, MorphoHelper {

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
        SubParams memory triggerSubData = parseInputs(_subData);
        uint256 currRatio = IMorphoAaveV2Lens(MORPHO_AAVEV2_LENS_ADDR).getUserHealthFactor(triggerSubData.user);
        
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

    function parseInputs(bytes memory _subData) internal pure returns (SubParams memory params) {
        params = abi.decode(_subData, (SubParams));
    }
    function changedSubData(bytes memory _subData) public pure override  returns (bytes memory) {
    }
    
    function isChangeable() public pure override returns (bool){
        return false;
    }

}
