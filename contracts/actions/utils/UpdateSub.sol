// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ActionBase } from "../ActionBase.sol";
import { SubStorage } from "../../core/strategy/SubStorage.sol";
import { StrategyModel } from "../../core/strategy/StrategyModel.sol";

/// @title Updates users sub information on SubStorage contract
/// @notice User can only change his own subscriptions
contract UpdateSub is ActionBase {

    /// @param subId Id of the Subscription
    /// @param sub Object that represents the updated sub
    struct Params {
        uint256 subId;
        StrategyModel.StrategySub sub;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public virtual override payable returns (bytes32) {
        Params memory inputData = parseInputs(_callData);

        inputData.subId = _parseParamUint(inputData.subId, _paramMapping[0], _subData, _returnValues);

        for (uint256 i = 0; i < inputData.sub.subData.length; i++){
            inputData.sub.subData[i] = _parseParamABytes32(inputData.sub.subData[i], _paramMapping[1+i], _subData, _returnValues);
        }

        updateSubData(inputData);

        return (bytes32(inputData.subId));
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
        SubStorage(SUB_STORAGE_ADDR).updateSubData(_inputData.subId, _inputData.sub);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
