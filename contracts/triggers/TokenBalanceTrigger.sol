// SPDX-License-Identifier: MIT

pragma solidity =0.8.4;

import "../auth/AdminAuth.sol";
import "../interfaces/ITrigger.sol";
import "../interfaces/IERC20.sol";

contract TokenBalanceTrigger is ITrigger, AdminAuth {
    enum BalanceState {OVER, UNDER, EQUALS}
    struct SubParams {
        address tokenAddr;
        address userAddr;
        uint256 targetBalance;
        uint8 state;
    }

    function isTriggered(bytes memory, bytes memory _subData) public view override returns (bool) {
        SubParams memory triggerSubData = parseInputs(_subData);
        
        uint256 currBalance = IERC20(triggerSubData.tokenAddr).balanceOf(triggerSubData.userAddr);

        if (BalanceState(triggerSubData.state) == BalanceState.OVER) {
            if (currBalance > triggerSubData.targetBalance) return true;
        } else if (BalanceState(triggerSubData.state) == BalanceState.UNDER) {
            if (currBalance < triggerSubData.targetBalance) return true;
        } else if (BalanceState(triggerSubData.state) == BalanceState.EQUALS) {
            if (currBalance == triggerSubData.targetBalance) return true;
        }

        return false;
    }

    function changedSubData(bytes memory _subData) public pure override returns (bytes memory) {
    }
    
    function isChangeable() public pure override returns (bool){
        return false;
    }

    function parseInputs(bytes memory _subData) public pure returns (SubParams memory params) {
        params = abi.decode(_subData, (SubParams));
    }
}
