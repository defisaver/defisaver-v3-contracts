// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;

abstract contract IFLAction {
    enum ActionType { FL_ACTION, STANDARD_ACTION, CUSTOM_ACTION }

    function executeAction(uint, bytes memory) virtual public returns (bytes memory);
    function actionType() virtual public returns (uint8);
}
