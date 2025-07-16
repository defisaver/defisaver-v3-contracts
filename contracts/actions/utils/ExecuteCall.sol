// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import {ActionBase} from "../ActionBase.sol";

contract ExecuteCall is ActionBase {

    struct Params {
        address to;
        uint256 value;
        bytes data;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory,
        uint8[] memory,
        bytes32[] memory
    ) public virtual override payable returns (bytes32) {
        Params memory inputData = parseInputs(_callData);

        executeCall(inputData.to, inputData.value, inputData.data);
        return bytes32(0);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public override payable {
        Params memory inputData = parseInputs(_callData);

        executeCall(inputData.to, inputData.value, inputData.data);
    }

    /// @inheritdoc ActionBase
    function actionType() public virtual override pure returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    
    function executeCall(address _to, uint256 _value, bytes memory _data) internal {
        (bool success,) = _to.call{value: _value}(_data);
        require(success);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}