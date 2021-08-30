// SPDX-License-Identifier: MIT
pragma solidity =0.8.4;

import "../ActionBase.sol";
import "../../interfaces/strategy/ISubStorage.sol";

/// @title Helper action to change sub data for user proxy
contract ChangeTriggerData is ActionBase {
    
    struct Params {
        address subStorageAddr;
        uint256 subId;
        bytes triggerData;
        uint256 triggerNum;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public virtual override payable returns (bytes32) {
        Params memory inputData = parseInputs(_callData);
        _changeSubData(inputData);
        return bytes32(inputData.subId);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public override payable {
        Params memory inputData = parseInputs(_callData);
        _changeSubData(inputData);
    }

    /// @inheritdoc ActionBase
    function actionType() public virtual override pure returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }


    //////////////////////////// ACTION LOGIC ////////////////////////////
    
    function _changeSubData(Params memory _params) public{
        ISubStorage(_params.subStorageAddr).updateSubTriggerData(_params.subId, _params.triggerData, _params.triggerNum);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
