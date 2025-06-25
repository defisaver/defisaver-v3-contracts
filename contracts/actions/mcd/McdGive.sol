// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IProxyRegistry } from "../../interfaces/IProxyRegistry.sol";
import { IDSProxy } from "../../interfaces/IDSProxy.sol";
import { IManager } from "../../interfaces/mcd/IManager.sol";
import { McdHelper } from "./helpers/McdHelper.sol";
import { ActionBase } from "../ActionBase.sol";

/// @title Gives the vault ownership to a different address
contract McdGive is ActionBase, McdHelper{

    //Can't send vault to 0x0
    error NoBurnVaultError();

    /// @param vaultId Id of the vault
    /// @param newOwner Address of the new owner
    /// @param mcdManager Manager address
    struct Params {
        uint256 vaultId;
        address newOwner;
        address mcdManager;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory inputData = parseInputs(_callData);

        inputData.vaultId = _parseParamUint(inputData.vaultId, _paramMapping[0], _subData, _returnValues);
        inputData.newOwner = _parseParamAddr(inputData.newOwner, _paramMapping[1], _subData, _returnValues);
        inputData.mcdManager = _parseParamAddr(inputData.mcdManager, _paramMapping[2], _subData, _returnValues);

        (address newOwner, bytes memory logData) = _mcdGive(inputData.vaultId, inputData.newOwner, inputData.mcdManager);
        emit ActionEvent("McdGive", logData);
        return bytes32(bytes20(newOwner));
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory inputData = parseInputs(_callData);
        (, bytes memory logData) = _mcdGive(inputData.vaultId, inputData.newOwner, inputData.mcdManager);
        logger.logActionDirectEvent("McdGive", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @param _vaultId The id of the vault
    /// @param _newOwner The address of the new owner
    /// @param _mcdManager Manager address
    function _mcdGive(
        uint256 _vaultId,
        address _newOwner,
        address _mcdManager
    ) internal returns (address, bytes memory logData) {
 
        if (_newOwner == address(0)){
            revert NoBurnVaultError();
        }

        IManager(_mcdManager).give(_vaultId, _newOwner);
        logData = abi.encode(_vaultId, _newOwner, _mcdManager);

        return (_newOwner, logData);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
