// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { AdminAuth } from "../auth/AdminAuth.sol";
import { ITrigger } from "../interfaces/ITrigger.sol";
import { ICrvUsdController, ILLAMMA } from "../interfaces/curveusd/ICurveUsd.sol";

/// @title Trigger that triggers when the borrow rate of a CurveUsd market is over or under a certain rate.
contract CurveUsdBorrowRateTrigger is ITrigger, AdminAuth {
 
    enum TargetRateState { OVER, UNDER }
    
    /// @param market - CurveUsd market
    /// @param targetRate - Rate that represents the triggerable point
    /// @param state - Represents if we want the current state to be higher or lower than targetRate
    struct SubParams {
        address market;
        uint256 targetRate;
        uint8 state;
    }
    
    function isTriggered(bytes memory, bytes memory _subData)
        public
        view
        override
        returns (bool)
    {   
        SubParams memory triggerSubData = parseSubInputs(_subData);

        uint256 currentRate = calcBorrowRate(triggerSubData.market);

        if (TargetRateState(triggerSubData.state) == TargetRateState.OVER) {
            if (currentRate > triggerSubData.targetRate) {
                return true;
            }
        }

        if (TargetRateState(triggerSubData.state) == TargetRateState.UNDER) {
            if (currentRate < triggerSubData.targetRate) {
                return true;
            }
        }

        return false;
    }

    function calcBorrowRate(address _market) public view returns (uint256) {
        ICrvUsdController ctrl = ICrvUsdController(_market);
        ILLAMMA amm = ILLAMMA(ctrl.amm());

        return amm.rate();
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
