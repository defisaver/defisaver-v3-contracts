// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;

import "./ActionBase.sol";

contract ActionTemplate is ActionBase {
    function executeAction(
        uint256 _actionSubId,
        bytes memory _callData,
        bytes32[] memory _returnValues
    ) public override payable virtual returns (bytes32) 
    // solhint-disable-next-line no-empty-blocks
    {
        // parse call data

        // parse return values

        // verify with actions sub data if their is some

        // do the action

        // log
    }

    function actionType() public override pure virtual returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }
}