// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../ActionBase.sol";
import "../../core/strategy/SubStorage.sol";

/// @title ToggleSub - Sets the state of the sub to active or deactivated
/// @dev User can only disable/enable his own subscriptions
contract ToggleSub is ActionBase {
    struct Params {
        uint256 subId;
        bool active;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory,
        uint8[] memory,
        bytes32[] memory
    ) public virtual override payable returns (bytes32) {
        Params memory inputData = parseInputs(_callData);

        updateSubData(inputData);

        return(bytes32(inputData.subId));
    }

    function executeActionDirect(bytes memory _callData) public override payable {
        Params memory inputData = parseInputs(_callData);

        updateSubData(inputData);
    }

    /// @inheritdoc ActionBase
    function actionType() public virtual override pure returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    function updateSubData(Params memory _inputData) internal {
        if (_inputData.active) {
            SubStorage(SUB_STORAGE_ADDR).activateSub(_inputData.subId);
        } else {
            SubStorage(SUB_STORAGE_ADDR).deactivateSub(_inputData.subId);
        }
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
