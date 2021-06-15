// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;
pragma abicoder v2; // solhint-disable-line

import "../auth/AdminAuth.sol";
import "../core/strategy/Subscriptions.sol";
import "../actions/mcd/helpers/McdRatioHelper.sol";
import "../interfaces/ITrigger.sol";

contract McdRatioTrigger is ITrigger, AdminAuth, McdRatioHelper {

    enum RatioState { OVER, UNDER }

    function isTriggered(bytes memory _callData, bytes[] memory _subData)
        public
        view
        override
        returns (bool)
    {
        uint256 nextPrice = parseParamData(_callData);
        (uint256 vaultId, uint256 ratio, uint8 state) = parseSubData(_subData);

        uint256 currRatio = getRatio(vaultId, nextPrice);

        if (RatioState(state) == RatioState.OVER) {
            if (currRatio > ratio) return true;
        }

        if (RatioState(state) == RatioState.UNDER) {
            if (currRatio < ratio) return true;
        }

        return false;
    }

    function parseSubData(bytes[] memory _data)
        public
        pure
        returns (
            uint256 vaultId,
            uint256 ratio,
            uint8 state
        )
    {
        vaultId = abi.decode(_data[0], (uint256));
        ratio= abi.decode(_data[1], (uint256));
        state = abi.decode(_data[2], (uint8));
    }

    function parseParamData(bytes[] memory _data) public pure returns (uint256 nextPrice) {
        (nextPrice) = abi.decode(_data[0], (uint256));
    }

}
