// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import "../ActionBase.sol";

/// @title Helper action to sum up 2 inputs/return values
contract SumInputs is ActionBase {

    /// @inheritdoc ActionBase
    function executeAction(
        bytes[] memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public virtual override payable returns (bytes32) {
        uint a = abi.decode(_callData[0], (uint));
        uint b = abi.decode(_callData[1], (uint));

        a = _parseParamUint(a, _paramMapping[0], _subData, _returnValues);
        b = _parseParamUint(b, _paramMapping[1], _subData, _returnValues);

        return bytes32(_sumInputs(a, b));
    }

    // solhint-disable-next-line no-empty-blocks
    function executeActionDirect(bytes[] memory _callData) public override payable {}

    /// @inheritdoc ActionBase
    function actionType() public virtual override pure returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    function _sumInputs(uint _a, uint _b) internal pure returns (uint) {
        return _a + _b;
    }
}
