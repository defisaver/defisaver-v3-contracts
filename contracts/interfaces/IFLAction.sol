// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;

abstract contract IFLAction {
    enum ActionType {FL_ACTION, STANDARD_ACTION, CUSTOM_ACTION}

    function executeAction(uint256, bytes memory) public virtual returns (bytes memory);

    function actionType() public virtual returns (uint8);
}
