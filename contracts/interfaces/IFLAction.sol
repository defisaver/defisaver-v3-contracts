// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

abstract contract IFLAction {
    enum ActionType {FL_ACTION, STANDARD_ACTION, CUSTOM_ACTION}

    function executeAction(
        bytes[] memory,
        bytes[] memory,
        uint8[] memory,
        bytes32[] memory
    ) public virtual returns (bytes32);

    function actionType() public virtual returns (uint8);
}
