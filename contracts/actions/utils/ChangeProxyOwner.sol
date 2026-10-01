// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IDFSProxyRegistryV2 } from "../../interfaces/utils/IDFSProxyRegistryV2.sol";
import { IDSAuth } from "../../interfaces/DS/IDSAuth.sol";
import { ActionBase } from "../ActionBase.sol";
import { DFSIds } from "../../utils/DFSIds.sol";

/// @title Changes the owner of the DSProxy and updates DFSProxyRegistryV2
contract ChangeProxyOwner is ActionBase {
    /// @notice Error thrown when the new owner address is the zero address
    error ZeroOwnerAddress();

    /// @param newOwner Address of the new owner
    struct Params {
        address newOwner;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory inputData = parseInputs(_callData);

        inputData.newOwner =
            _parseParamAddr(inputData.newOwner, _paramMapping[0], _subData, _returnValues);

        _changeOwner(inputData.newOwner);

        return bytes32(bytes20(inputData.newOwner));
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory inputData = parseInputs(_callData);

        _changeOwner(inputData.newOwner);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    /*//////////////////////////////////////////////////////////////
                            ACTION LOGIC
    //////////////////////////////////////////////////////////////*/
    function _changeOwner(address _newOwner) internal {
        if (_newOwner == address(0)) revert ZeroOwnerAddress();

        IDSAuth(address(this)).setOwner(_newOwner);

        address dfsProxyRegistry = registry.getAddr(DFSIds.DFS_PROXY_REGISTRY_V2);
        IDFSProxyRegistryV2(dfsProxyRegistry).syncProxy(address(this));
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
