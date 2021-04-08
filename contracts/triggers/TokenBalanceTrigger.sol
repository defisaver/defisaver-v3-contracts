// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;

import "../auth/AdminAuth.sol";
import "../interfaces/ITrigger.sol";
import "../interfaces/IERC20.sol";

contract TokenBalanceTrigger is ITrigger, AdminAuth {
    enum BalanceState {OVER, UNDER, EQUALS}

    function isTriggered(bytes memory, bytes memory _subData) public view override returns (bool) {
        (
            address tokenAddr,
            address userAddr,
            uint256 targetBalance,
            BalanceState state
        ) = parseSubData(_subData);
        uint256 currBalance = IERC20(tokenAddr).balanceOf(userAddr);

        if (state == BalanceState.OVER) {
            if (currBalance > targetBalance) return true;
        } else if (state == BalanceState.UNDER) {
            if (currBalance < targetBalance) return true;
        } else if (state == BalanceState.EQUALS) {
            if (currBalance == targetBalance) return true;
        }

        return false;
    }

    function parseSubData(bytes memory _data)
        public
        pure
        returns (
            address,
            address,
            uint256,
            BalanceState
        )
    {
        (address tokenAddr, address userAddr, uint256 targetBalance, uint8 state) = abi.decode(
            _data,
            (address, address, uint256, uint8)
        );

        return (tokenAddr, userAddr, targetBalance, BalanceState(state));
    }

    function parseParamData(bytes memory _data) public pure returns (uint256 nextPrice) {
        (nextPrice) = abi.decode(_data, (uint256));
    }
}
