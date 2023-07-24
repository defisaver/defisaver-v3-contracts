// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../auth/AdminAuth.sol";
import "../interfaces/ITrigger.sol";
import "../DS/DSMath.sol";
import "../interfaces/curveusd/ICurveUsd.sol";

contract CurveUsdSoftLiquidationTrigger is ITrigger, DSMath, AdminAuth {
     
    struct SubParams {
        address market;
        address user;
        uint256 percentage;
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
