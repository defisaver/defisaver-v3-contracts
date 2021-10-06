// SPDX-License-Identifier: MIT

pragma solidity =0.8.4;

import "../auth/AdminAuth.sol";
import "../interfaces/ITrigger.sol";
import "../interfaces/IERC20.sol";

contract TokenBalanceTrigger is ITrigger, AdminAuth {
    enum BalanceState {OVER, UNDER, EQUALS}
    struct Params {
        address tokenAddr;
        address userAddr;
        uint256 targetBalance;
        uint8 state;
    }

    function isTriggered(bytes memory, bytes memory _subData) public view override returns (bool) {
        Params memory inputData = parseInputs(_subData);
        
        uint256 currBalance = IERC20(inputData.tokenAddr).balanceOf(inputData.userAddr);

        if (BalanceState(inputData.state) == BalanceState.OVER) {
            if (currBalance > inputData.targetBalance) return true;
        } else if (BalanceState(inputData.state) == BalanceState.UNDER) {
            if (currBalance < inputData.targetBalance) return true;
        } else if (BalanceState(inputData.state) == BalanceState.EQUALS) {
            if (currBalance == inputData.targetBalance) return true;
        }

        return false;
    }
    function changedSubData(bytes memory _subData) public pure override returns (bytes memory) {
    }
    
    function isChangeable() public pure override returns (bool){
        return false;
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
