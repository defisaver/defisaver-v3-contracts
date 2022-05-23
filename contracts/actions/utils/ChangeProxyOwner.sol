// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;
pragma experimental ABIEncoderV2;

import "../ActionBase.sol";
import "../../utils/DFSProxyRegistryController.sol";

/// @title Changes the owner of the DSProxy and updated the DFSRegistry
contract ChangeProxyOwner is ActionBase {

    struct Params {
        address newOwner;
    }

    DFSProxyRegistryController constant dfsRegController =
        DFSProxyRegistryController(DFS_REG_CONTROLLER_ADDR);
    
    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory inputData = parseInputs(_callData);

        inputData.newOwner = _parseParamAddr(inputData.newOwner, _paramMapping[0], _subData, _returnValues);

        _changeOwner(inputData.newOwner);

        return bytes32(bytes20(inputData.newOwner));
    }

    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory inputData = parseInputs(_callData);

        _changeOwner(inputData.newOwner);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    function _changeOwner(address _newOwner) internal {
        require(_newOwner != address(0), "Owner is empty address");

        DSAuth(address(this)).setOwner(_newOwner);
        
        dfsRegController.changeOwnerInDFSRegistry(_newOwner);
    }

    function parseInputs(bytes memory _callData) internal pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
