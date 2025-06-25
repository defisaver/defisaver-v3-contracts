// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ActionBase } from "../ActionBase.sol";
import { ReflexerHelper } from "./helpers/ReflexerHelper.sol";
import { IBasicTokenAdapters } from "../../interfaces/reflexer/IBasicTokenAdapters.sol";

/// @title Open a new Reflexer safe
contract ReflexerOpen is ActionBase, ReflexerHelper {

    /// @param adapterAddr Address of the adapter
    struct Params {
        address adapterAddr;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory inputData = parseInputs(_callData);

        inputData.adapterAddr = _parseParamAddr(inputData.adapterAddr, _paramMapping[0], _subData, _returnValues);

        (uint256 newSafeId, bytes memory logData) = _reflexerOpen(inputData.adapterAddr);
        emit ActionEvent("ReflexerOpen", logData);
        return bytes32(newSafeId);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory inputData = parseInputs(_callData);
        (, bytes memory logData) = _reflexerOpen(inputData.adapterAddr);
        logger.logActionDirectEvent("ReflexerOpen", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @param _adapterAddr Adapter address of the Reflexer collateral
    function _reflexerOpen(address _adapterAddr) internal returns (uint256 safeId, bytes memory logData) {
        bytes32 collType = IBasicTokenAdapters(_adapterAddr).collateralType();
        safeId = safeManager.openSAFE(collType, address(this));
        logData = abi.encode(safeId, _adapterAddr);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
