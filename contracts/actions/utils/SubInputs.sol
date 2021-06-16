// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;
import "../../DS/DSMath.sol";
import "../ActionBase.sol";

/// @title Helper action to subtract 2 inputs/return values
contract SubInputs is ActionBase, DSMath {
    struct Params {
        uint256 a;
        uint256 b;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public virtual override payable returns (bytes32) {
        Params memory inputData = parseInputs(_callData);

        inputData.a = _parseParamUint(inputData.a, _paramMapping[0], _subData, _returnValues);
        inputData.b = _parseParamUint(inputData.b, _paramMapping[1], _subData, _returnValues);

        return bytes32(_subInputs(inputData.a, inputData.b));
    }

    // solhint-disable-next-line no-empty-blocks
    function executeActionDirect(bytes memory _callData) public override payable {}

    /// @inheritdoc ActionBase
    function actionType() public virtual override pure returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    function _subInputs(uint _a, uint _b) internal pure returns (uint) {
        return sub(_a, _b);
    }

    function parseInputs(bytes memory _callData) internal pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
