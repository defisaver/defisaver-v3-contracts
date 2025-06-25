// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IJoin } from "../../interfaces/mcd/IJoin.sol";
import { IManager } from "../../interfaces/mcd/IManager.sol";
import { ICdpRegistry } from "../../interfaces/mcd/ICdpRegistry.sol";
import { McdHelper } from "./helpers/McdHelper.sol";
import { ActionBase } from "../ActionBase.sol";

/// @title Open a new Maker empty vault
contract McdOpen is ActionBase, McdHelper {

    /// @param joinAddr Join address of the maker collateral
    /// @param mcdManager The manager address we are using
    struct Params {
        address joinAddr;
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

        inputData.joinAddr = _parseParamAddr(inputData.joinAddr, _paramMapping[0], _subData, _returnValues);
        inputData.mcdManager = _parseParamAddr(inputData.mcdManager, _paramMapping[1], _subData, _returnValues);

        (uint256 newVaultId, bytes memory logData) = _mcdOpen(inputData.joinAddr, inputData.mcdManager);
        emit ActionEvent("McdOpen", logData);
        return bytes32(newVaultId);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory inputData = parseInputs(_callData);
        (, bytes memory logData) = _mcdOpen(inputData.joinAddr, inputData.mcdManager);
        logger.logActionDirectEvent("McdOpen", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @param _joinAddr Join address of the maker collateral
    /// @param _mcdManager The manager address we are using
    function _mcdOpen(address _joinAddr, address _mcdManager) internal returns (uint256 vaultId, bytes memory logData) {
        bytes32 ilk = IJoin(_joinAddr).ilk();

        if (_mcdManager == CROPPER) {
            vaultId = ICdpRegistry(CDP_REGISTRY).open(ilk, address(this));
        } else {
            vaultId = IManager(_mcdManager).open(ilk, address(this));
        }
                
        logData = abi.encode(vaultId, _joinAddr, _mcdManager);

    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
