// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;
pragma abicoder v2;

import "../auth/AdminAuth.sol";
import "../interfaces/ITrigger.sol";
import "../interfaces/IERC20.sol";

contract TokenBalanceTrigger is ITrigger, AdminAuth {
    enum BalanceState {OVER, UNDER, EQUALS}

    function isTriggered(bytes[] memory, bytes[] memory _subData) public view override returns (bool) {
        (
            address tokenAddr,
            address userAddr,
            uint256 targetBalance,
            uint8 state
        ) = parseSubData(_subData);
        uint256 currBalance = IERC20(tokenAddr).balanceOf(userAddr);

        if (BalanceState(state) == BalanceState.OVER) {
            if (currBalance > targetBalance) return true;
        } else if (BalanceState(state) == BalanceState.UNDER) {
            if (currBalance < targetBalance) return true;
        } else if (BalanceState(state) == BalanceState.EQUALS) {
            if (currBalance == targetBalance) return true;
        }

        return false;
    }

    function parseSubData(bytes[] memory _data)
        public
        pure
        returns (
            address tokenAddr,
            address userAddr,
            uint256 targetBalance,
            uint8 state
        )
    {
        tokenAddr = abi.decode(_data[0], (address));
        userAddr = abi.decode(_data[1], (address));
        targetBalance = abi.decode(_data[2], (uint256));
        state = abi.decode(_data[3], (uint8));

    }

    function parseParamData(bytes memory _data) public pure returns (uint256 nextPrice) {
        (nextPrice) = abi.decode(_data, (uint256));
    }
}
