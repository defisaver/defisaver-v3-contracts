// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import "../ActionBase.sol";
import "../../core/Subscriptions.sol";

contract FLTaker is ActionBase {

    function executeAction(
        bytes[] memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public override payable returns (bytes32) {
        uint amount = abi.decode(_callData[0], (uint));
        address token = abi.decode(_callData[1], (address));
        uint8 flType = abi.decode(_callData[2], (uint8));

        amount = _parseParamUint(amount, _paramMapping[0], _subData, _returnValues);
        token = _parseParamAddr(token, _paramMapping[1], _subData, _returnValues);
        flType = uint8(_parseParamUint(flType, _paramMapping[2], _subData, _returnValues));

        logger.Log(address(this), msg.sender, "FLTaker", abi.encode(amount, token, flType));

        return bytes32(amount);
    }

    // solhint-disable-next-line no-empty-blocks
    function executeActionDirect(bytes[] memory _callData) public override payable {}

    function parseParamData(bytes memory _data) public pure returns (uint amount,address token,uint8 flType) {
        (amount, token, flType) = abi.decode(_data,(uint256,address,uint8));
    }

    function actionType() override public pure returns (uint8) {
        return uint8(ActionType.FL_ACTION);
    }

}
