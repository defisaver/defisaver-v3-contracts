// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import "../../interfaces/IFLAction.sol";
import "../../core/Subscriptions.sol";

contract FLTaker is IFLAction {

    DefisaverLogger public constant logger = DefisaverLogger(0x5c55B921f590a89C1Ebe84dF170E655a82b62126);

    function executeAction(
        bytes[] memory _callData,
        bytes[] memory,
        uint8[] memory
    ) override public returns (bytes memory) {

        uint amount = abi.decode(_callData[0], (uint));
        address token = abi.decode(_callData[1], (address));
        uint8 flType = abi.decode(_callData[2], (uint8));

        // parse sub data?

        logger.Log(address(this), msg.sender, "FLTaker", abi.encode(amount, token, flType));

        return abi.encode(amount, token, flType);
    }

    function parseSubData(bytes memory _data) public pure returns (uint amount,address token,uint8 flType) {
        (amount, token, flType) = abi.decode(_data,(uint256,address,uint8));
    }

    function parseParamData(bytes memory _data) public pure returns (uint amount,address token,uint8 flType) {
        (amount, token, flType) = abi.decode(_data,(uint256,address,uint8));
    }

    function actionType() override public pure returns (uint8) {
        return uint8(ActionType.FL_ACTION);
    }

}
