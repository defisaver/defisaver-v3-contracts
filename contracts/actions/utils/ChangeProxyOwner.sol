// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "../ActionBase.sol";
import "../../utils/DFSProxyRegistryController.sol";

/// @title Changes the owner of the DSProxy and updated the DFSRegistry
contract ChangeProxyOwner is ActionBase {
    DFSProxyRegistryController constant dfsRegController =
        DFSProxyRegistryController(0xfc7b5881d36F7Cfa40380E26D6Dc8eBf2C942CB6);

    /// @inheritdoc ActionBase
    function executeAction(
        bytes[] memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        address newOwner = parseInputs(_callData);

        newOwner = _parseParamAddr(newOwner, _paramMapping[0], _subData, _returnValues);

        _changeOwner(newOwner);

        return bytes32(bytes20(newOwner));
    }

    // solhint-disable-next-line no-empty-blocks
    function executeActionDirect(bytes[] memory _callData) public payable override {
        address newOwner = parseInputs(_callData);

        _changeOwner(newOwner);
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

    function parseInputs(bytes[] memory _callData) internal pure returns (address newOwner) {
        newOwner = abi.decode(_callData[0], (address));
    }
}
