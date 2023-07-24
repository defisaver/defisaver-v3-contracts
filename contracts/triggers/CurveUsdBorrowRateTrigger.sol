// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../auth/AdminAuth.sol";
import "../interfaces/ITrigger.sol";
import "../DS/DSMath.sol";
import "../interfaces/curveusd/ICurveUsd.sol";

contract CurveUsdBorrowRateTrigger is ITrigger, DSMath, AdminAuth {
 
    enum TargetRateState { OVER, UNDER }
    
    /// @param user address of the user whose position we check
    /// @param _market Main Comet proxy contract that is different for each compound market
    /// @param ratio ratio that represents the triggerable point
    /// @param state represents if we want the current state to be higher or lower than ratio param
    struct SubParams {
        address market;
        uint256 targetRate;
        uint8 state;
    }
    
    /// @dev checks current safety ratio of a CompoundV3 position and triggers if it's in a correct state
    function isTriggered(bytes memory, bytes memory _subData)
        public
        override
        returns (bool)
    {   
        SubParams memory triggerSubData = parseInputs(_subData);

        

        return false;
    }

    function _calcBorrowRate(address _market) public view returns (uint256) {
        ICrvUsdController ctrl = ICrvUsdController(_market);
        ILLAMMA amm = ILLAMMA(ctrl.amm());

        return amm.rate();
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
