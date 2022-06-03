// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../auth/AdminAuth.sol";
import "../actions/aaveV3/helpers/AaveV3RatioHelper.sol";
import "../interfaces/ITrigger.sol";

import "hardhat/console.sol";

contract AaveV3RatioTrigger is ITrigger, AdminAuth, AaveV3RatioHelper {

    enum RatioState { OVER, UNDER }
    
    /// @param user address of the user whose position we check
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
        view
        override
        returns (bool)
    {   
        console.logBytes(_subData);
        SubParams memory triggerSubData = parseInputs(_subData);

        console.log(triggerSubData.market, triggerSubData.user);

        uint256 currRatio = getSafetyRatio(triggerSubData.market, triggerSubData.user);

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
