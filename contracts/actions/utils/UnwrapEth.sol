// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import "../../utils/TokenUtils.sol";
import "../ActionBase.sol";

/// @title Helper action to wrap Ether to WETH9
contract UnwrapEth is ActionBase {

    /// @inheritdoc ActionBase
    function executeAction(
        bytes[] memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public virtual override payable returns (bytes32) {
        uint amount = abi.decode(_callData[0], (uint));

        amount = _parseParamUint(amount, _paramMapping[0], _subData, _returnValues);

        return bytes32(_unwrapEth(amount));
    }

    // solhint-disable-next-line no-empty-blocks
    function executeActionDirect(bytes[] memory _callData) public override payable {}

    /// @inheritdoc ActionBase
    function actionType() public virtual override pure returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    function _unwrapEth(uint _amount) internal returns (uint) {
        TokenUtils.withdrawWeth(_amount);
        return _amount;
    }
}
