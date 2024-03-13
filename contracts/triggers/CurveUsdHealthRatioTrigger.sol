// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import { AdminAuth } from "../auth/AdminAuth.sol";
import { TriggerHelper } from "./helpers/TriggerHelper.sol";
import { ITrigger } from "../interfaces/ITrigger.sol";
import { ICrvUsdController } from "../interfaces/curveusd/ICurveUsd.sol";

/// @title Trigger contract that verifies if the CurveUSD position health ratio went under the subbed ratio
contract CurveUsdHealthRatioTrigger is ITrigger, AdminAuth, TriggerHelper {

    /// @param user address of the user whose position we check
    /// @param market CurveUSD controller address
    /// @param ratio ratio that represents the triggerable point
    struct SubParams {
        address user;
        address market;
        uint256 ratio;
    }
    
    /// @dev checks current health ratio of a CurveUsd position and triggers if it's in a correct state
    function isTriggered(bytes memory, bytes memory _subData)
        public
        override
        view
        returns (bool)
    {   
        SubParams memory triggerSubData = parseInputs(_subData);
        ICrvUsdController controller = ICrvUsdController(triggerSubData.market);

        if (!controller.loan_exists(triggerSubData.user)) {
            return false;
        }

        int256 currentHealth = controller.health(triggerSubData.user, true);
        
        return uint256(currentHealth) < triggerSubData.ratio;
    }

    function parseInputs(bytes memory _subData) internal pure returns (SubParams memory params) {
        params = abi.decode(_subData, (SubParams));
    }

    function changedSubData(bytes memory _subData) public pure override  returns (bytes memory) {}
    
    function isChangeable() public pure override returns (bool) {
        return false;
    }
}
