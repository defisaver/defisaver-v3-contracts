// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ActionBase } from "../ActionBase.sol";

/// @title Helper action to sum up 2 inputs/return values
contract SumInputs is ActionBase {
    /// @param a First input
    /// @param b Second input
    struct Params {
        uint256 a;
        uint256 b;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory inputData = parseInputs(_callData);

        inputData.a = _parseParamUint(inputData.a, _paramMapping[0], _subData, _returnValues);
        inputData.b = _parseParamUint(inputData.b, _paramMapping[1], _subData, _returnValues);

        return bytes32(_sumInputs(inputData.a, inputData.b));
    }

    // solhint-disable-next-line no-empty-blocks
    function executeActionDirect(bytes memory _callData) public payable override { }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    function _sumInputs(uint256 _a, uint256 _b) internal pure returns (uint256) {
        return _a + _b;
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
