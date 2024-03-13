// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import { AdminAuth } from "../auth/AdminAuth.sol";
import { TriggerHelper } from "./helpers/TriggerHelper.sol";
import { ITrigger } from "../interfaces/ITrigger.sol";
import { IERC20 } from "../interfaces/IERC20.sol";

/// @title Trigger contract that triggers if user has enough balance and has given enough allowance
/// @dev When from address balance is lesser than amount, useBalanceFrom should use whole from balance if set to true
contract BalanceAndAllowanceTrigger is ITrigger, AdminAuth, TriggerHelper {

    struct SubParams {
        address from;
        address to;
        address token;
        uint256 amount;
        bool useBalanceFrom;
    }
    
    function isTriggered(bytes memory, bytes memory _subData)
        public
        view
        override
        returns (bool)
    {   
        SubParams memory triggerSubData = parseInputs(_subData);

        uint256 fromBalance = IERC20(triggerSubData.token).balanceOf(triggerSubData.from);
        uint256 allowance = IERC20(triggerSubData.token).allowance(triggerSubData.from, triggerSubData.to);

        return triggerSubData.useBalanceFrom && (fromBalance < triggerSubData.amount)
            ? (fromBalance > 0) && (allowance >= fromBalance)
            : (fromBalance >= triggerSubData.amount) && (allowance >= triggerSubData.amount);
    }

    function parseInputs(bytes memory _subData) internal pure returns (SubParams memory params) {
        params = abi.decode(_subData, (SubParams));
    }

    function changedSubData(bytes memory _subData) public pure override  returns (bytes memory) {}
    
    function isChangeable() public pure override returns (bool) {
        return false;
    }
}
